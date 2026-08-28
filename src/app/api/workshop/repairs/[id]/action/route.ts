import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, badRequest, getBody } from '@/lib/api';

const STATUS_FLOW: Record<string, string[]> = {
  open: ['troubleshooting', 'cancelled'],
  troubleshooting: ['quoted', 'beyond_repair'],
  quoted: ['paid', 'cancelled'],
  paid: ['in_repair'],
  in_repair: ['repaired'],
  repaired: ['dispatched'],
  beyond_repair: ['replacement_quoted', 'cancelled'],
  replacement_quoted: ['replacement_sent', 'cancelled'],
  replacement_sent: ['dispatched'],
  dispatched: ['completed'],
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const body: any = await getBody(request);
  const { action, notes, toStatus, repairCost, replacementCost, diagnosisNotes, paymentRef, replacementProductId, replacementProductName } = body;

  if (!action) return badRequest('Action is required');

  const card = await prisma.erpRepairJobCard.findUnique({ where: { id } });
  if (!card) return notFound('Repair job card not found');

  const userEmail = (session.user as any)?.email || 'unknown';

  if (action === 'advance_status') {
    const allowed = STATUS_FLOW[card.status] || [];
    if (!toStatus || !allowed.includes(toStatus)) {
      return badRequest(`Cannot transition from '${card.status}' to '${toStatus || 'undefined'}'`);
    }

    const updateData: any = { status: toStatus };
    if (toStatus === 'troubleshooting') updateData.assignedTechnician = card.assignedTechnician || userEmail;
    if (toStatus === 'completed') updateData.completedDate = new Date();
    if (toStatus === 'dispatched') updateData.dispatchDate = new Date();

    await prisma.erpRepairJobCard.update({ where: { id }, data: updateData });
    await prisma.erpRepairActivity.create({
      data: {
        jobCardId: id,
        action: 'status_change',
        fromStatus: card.status,
        toStatus,
        performedBy: userEmail,
        notes: notes || null,
      },
    });
  }

  if (action === 'submit_diagnosis') {
    const updateData: any = { status: 'quoted' };
    if (diagnosisNotes) updateData.diagnosisNotes = diagnosisNotes;
    if (repairCost !== undefined) updateData.repairCost = repairCost ? parseFloat(repairCost) : null;
    if (replacementCost !== undefined) updateData.replacementCost = replacementCost ? parseFloat(replacementCost) : null;

    await prisma.erpRepairJobCard.update({ where: { id }, data: updateData });
    await prisma.erpRepairActivity.create({
      data: {
        jobCardId: id,
        action: 'submit_diagnosis',
        fromStatus: card.status,
        toStatus: 'quoted',
        performedBy: userEmail,
        notes: `Repair cost: ${repairCost || 'TBD'}${replacementCost ? `, Replacement cost: ${replacementCost}` : ''}. ${notes || ''}`,
      },
    });
  }

  if (action === 'mark_beyond_repair') {
    const updateData: any = { status: 'beyond_repair', diagnosisNotes: diagnosisNotes || 'Equipment deemed beyond repair' };
    if (replacementCost !== undefined) updateData.replacementCost = replacementCost ? parseFloat(replacementCost) : null;

    await prisma.erpRepairJobCard.update({ where: { id }, data: updateData });
    await prisma.erpRepairActivity.create({
      data: {
        jobCardId: id,
        action: 'mark_beyond_repair',
        fromStatus: card.status,
        toStatus: 'beyond_repair',
        performedBy: userEmail,
        notes: notes || 'Equipment beyond repair. Replacement required.',
      },
    });
  }

  if (action === 'record_payment') {
    const updateData: any = { status: 'paid' };
    if (paymentRef) updateData.paymentRef = paymentRef;

    await prisma.erpRepairJobCard.update({ where: { id }, data: updateData });
    await prisma.erpRepairActivity.create({
      data: {
        jobCardId: id,
        action: 'record_payment',
        fromStatus: card.status,
        toStatus: 'paid',
        performedBy: userEmail,
        notes: `Payment received. Ref: ${paymentRef || 'N/A'}. ${notes || ''}`,
      },
    });
  }

  if (action === 'quote_replacement') {
    const updateData: any = { status: 'replacement_quoted' };
    if (replacementCost !== undefined) updateData.replacementCost = replacementCost ? parseFloat(replacementCost) : null;
    if (replacementProductId) updateData.replacementProductId = replacementProductId;
    if (replacementProductName) updateData.replacementProductName = replacementProductName;

    await prisma.erpRepairJobCard.update({ where: { id }, data: updateData });
    await prisma.erpRepairActivity.create({
      data: {
        jobCardId: id,
        action: 'quote_replacement',
        fromStatus: card.status,
        toStatus: 'replacement_quoted',
        performedBy: userEmail,
        notes: `Replacement quoted: ${replacementProductName || 'TBD'}. ${notes || ''}`,
      },
    });
  }

  if (action === 'dispatch_replacement') {
    await prisma.erpRepairJobCard.update({
      where: { id },
      data: { status: 'replacement_sent', dispatchDate: new Date() },
    });
    await prisma.erpRepairActivity.create({
      data: {
        jobCardId: id,
        action: 'dispatch_replacement',
        fromStatus: card.status,
        toStatus: 'replacement_sent',
        performedBy: userEmail,
        notes: notes || 'Replacement dispatched to branch',
      },
    });
  }

  const updated = await prisma.erpRepairJobCard.findUnique({
    where: { id },
    include: { branch: true, activities: { orderBy: { createdAt: 'desc' } } },
  });
  return ok(updated);
}

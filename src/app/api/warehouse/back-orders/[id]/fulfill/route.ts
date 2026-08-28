import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, badRequest, getBody } from '@/lib/api';

const STAGE_FLOW: Record<string, string[]> = {
  submitted: ['warehouse_review'],
  warehouse_review: ['procurement_needed', 'allocation'],
  procurement_needed: ['requisition_created'],
  requisition_created: ['po_created'],
  po_created: ['goods_received'],
  goods_received: ['allocation'],
  allocation: ['dispatched'],
  dispatched: ['closed'],
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const body: any = await getBody(request);
  const { action, toStage, notes, items } = body;

  if (!action) return badRequest('Action is required');

  const backOrder = await prisma.erpBackOrder.findUnique({ where: { id }, include: { lines: true } });
  if (!backOrder) return notFound('Back order not found');

  const userEmail = (session.user as any)?.email || 'unknown';

  if (action === 'advance_stage') {
    const allowed = STAGE_FLOW[backOrder.stage] || [];
    if (!toStage || !allowed.includes(toStage)) {
      return badRequest(`Cannot transition from '${backOrder.stage}' to '${toStage || 'undefined'}'`);
    }

    const updateData: any = { stage: toStage };
    if (toStage === 'warehouse_review') updateData.status = 'approved';
    if (toStage === 'allocation') updateData.status = 'allocated';
    if (toStage === 'closed') updateData.status = 'closed';
    if (toStage === 'procurement_needed' || toStage === 'requisition_created' || toStage === 'po_created') updateData.status = 'in_progress';

    await prisma.erpBackOrder.update({ where: { id }, data: updateData });
    await prisma.erpBackOrderActivity.create({
      data: {
        backOrderId: id,
        action,
        fromStage: backOrder.stage,
        toStage,
        performedBy: userEmail,
        notes: (notes as string) || null,
      },
    });
  }

  if (action === 'receive_goods') {
    if (!items?.length) return badRequest('Items with received quantities are required');

    const result = await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const line = backOrder.lines.find(l => l.id === item.lineId);
        if (!line) continue;
        const receivedQty = parseFloat(item.receivedQty) || 0;
        const newReceived = Number(line.receivedQty) + receivedQty;
        const newPurchased = Number(line.purchasedQty) + receivedQty;
        const newOutstanding = Number(line.requestedQty) - Number(line.allocatedQty) - newPurchased;
        await tx.erpBackOrderLine.update({
          where: { id: line.id },
          data: {
            receivedQty: newReceived,
            purchasedQty: newPurchased,
            outstandingQty: Math.max(0, newOutstanding),
            status: newOutstanding <= 0 ? 'allocated' : 'partially_allocated',
          },
        });
      }

      const updatedLines = await tx.erpBackOrderLine.findMany({ where: { backOrderId: id } });
      const allFulfilled = updatedLines.every(l => Number(l.outstandingQty) <= 0);
      const hasReceived = updatedLines.some(l => Number(l.receivedQty) > 0);

      await tx.erpBackOrder.update({
        where: { id },
        data: {
          stage: allFulfilled ? 'allocation' : 'goods_received',
          status: allFulfilled ? 'allocated' : hasReceived ? 'partially_received' : backOrder.status,
        },
      });

      return { allFulfilled };
    });

    await prisma.erpBackOrderActivity.create({
      data: {
        backOrderId: id,
        action: 'receive_goods',
        fromStage: backOrder.stage,
        toStage: result.allFulfilled ? 'allocation' : 'goods_received',
        performedBy: userEmail,
        notes: (notes as string) || 'Goods received',
      },
    });
  }

  if (action === 'create_requisition') {
    await prisma.erpBackOrder.update({
      where: { id },
      data: { stage: 'requisition_created', status: 'in_progress' },
    });
    await prisma.erpBackOrderActivity.create({
      data: {
        backOrderId: id,
        action: 'create_requisition',
        fromStage: backOrder.stage,
        toStage: 'requisition_created',
        performedBy: userEmail,
        notes: (notes as string) || 'Purchase requisition created',
        refType: 'purchase_requisition',
        refId: (items?.[0]?.requisitionId as string) || null,
      },
    });
  }

  if (action === 'create_po') {
    await prisma.erpBackOrder.update({
      where: { id },
      data: { stage: 'po_created', status: 'in_progress' },
    });
    await prisma.erpBackOrderActivity.create({
      data: {
        backOrderId: id,
        action: 'create_po',
        fromStage: backOrder.stage,
        toStage: 'po_created',
        performedBy: userEmail,
        notes: (notes as string) || 'Purchase order created',
        refType: 'purchase_order',
        refId: (items?.[0]?.poId as string) || null,
      },
    });
  }

  if (action === 'request_procurement') {
    await prisma.erpBackOrder.update({
      where: { id },
      data: { stage: 'procurement_needed', status: 'in_progress' },
    });
    await prisma.erpBackOrderActivity.create({
      data: {
        backOrderId: id,
        action: 'request_procurement',
        fromStage: backOrder.stage,
        toStage: 'procurement_needed',
        performedBy: userEmail,
        notes: (notes as string) || 'Procurement requested — DC stock insufficient',
      },
    });
  }

  if (action === 'update_lines') {
    if (!items?.length) return badRequest('Items are required');
    for (const item of items) {
      await prisma.erpBackOrderLine.update({
        where: { id: item.lineId },
        data: {
          purchasedQty: parseFloat(item.purchasedQty) || 0,
          notes: item.notes || null,
        },
      });
    }
    await prisma.erpBackOrderActivity.create({
      data: {
        backOrderId: id,
        action: 'update_lines',
        performedBy: userEmail,
        notes: (notes as string) || 'Line items updated',
      },
    });
  }

  const updated = await prisma.erpBackOrder.findUnique({
    where: { id },
    include: {
      branch: true,
      lines: true,
      activities: { orderBy: { createdAt: 'desc' } },
    },
  });

  return ok(updated);
}

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok, notFound, getBody } from '@/lib/api';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const item = await prisma.hrDisciplinary.findUnique({
    where: { id },
    include: {
      staff: { select: { id: true, employeeCode: true, firstName: true, lastName: true, department: true, position: true, branchId: true, email: true, phone: true } },
      hearings: { orderBy: { hearingDate: 'desc' } },
    },
  });

  if (!item) return notFound('Case not found');
  return ok(item);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  try {
    await prisma.hrDisciplinary.delete({ where: { id } });
    return ok({ success: true });
  } catch {
    return notFound('Case not found');
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const body = await getBody(request);
  const { action } = body;

  if (action === 'addHearing') {
    const { hearingDate, hearingTime, venue, verdict, outcome, notes, conductedBy, nextHearingDate, nextHearingTime, nextHearingVenue, warningIssued } = body;

    if (!hearingDate) return badRequest('Hearing date is required');

    const hearing = await prisma.hrDisciplinaryHearing.create({
      data: {
        caseId: id,
        hearingDate: new Date(hearingDate as string),
        hearingTime: (hearingTime as string) || null,
        venue: (venue as string) || null,
        verdict: (verdict as string) || null,
        outcome: (outcome as string) || null,
        notes: (notes as string) || null,
        conductedBy: (conductedBy as string) || null,
        nextHearingDate: nextHearingDate ? new Date(nextHearingDate as string) : null,
        nextHearingTime: (nextHearingTime as string) || null,
        nextHearingVenue: (nextHearingVenue as string) || null,
        warningIssued: (warningIssued as string) || null,
      },
    });

    const updateData: any = {};
    if (warningIssued) updateData.warningLevel = warningIssued;
    if (nextHearingDate) {
      updateData.nextHearingDate = new Date(nextHearingDate as string);
      updateData.nextHearingTime = (nextHearingTime as string) || null;
      updateData.nextHearingVenue = (nextHearingVenue as string) || null;
      updateData.status = 'hearing_scheduled';
    }
    if (verdict === 'dismissed') {
      updateData.status = 'closed';
      updateData.closedAt = new Date();
    } else if (verdict === 'no_action') {
      updateData.status = 'closed';
      updateData.closedAt = new Date();
    } else if (!nextHearingDate) {
      updateData.status = 'under_review';
    }

    await prisma.hrDisciplinary.update({ where: { id }, data: updateData });

    return ok(hearing);
  }

  return ok({ error: 'Invalid action' });
}

function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

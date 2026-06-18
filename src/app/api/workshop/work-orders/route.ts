import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, created, getBody, getNextSequence } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const equipmentId = searchParams.get('equipmentId');
  const status = searchParams.get('status');

  const where: any = {};
  if (search) {
    where.OR = [
      { woNumber: { contains: search } },
      { description: { contains: search } },
      { assignedTo: { contains: search } },
    ];
  }
  if (equipmentId) where.equipmentId = equipmentId;
  if (status) where.status = status;

  const items = await prisma.erpWorkOrder.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return ok(items);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { equipmentId, type, priority, description, assignedTo, scheduledDate, failureMode, notes } = body;

  if (!equipmentId || !type) return badRequest('Equipment and type are required');

  const woNumber = await getNextSequence(prisma, 'erpWorkOrder', 'woNumber', 'WO');

  const item = await prisma.erpWorkOrder.create({
    data: {
      woNumber,
      equipmentId: equipmentId as string,
      type: type as string,
      priority: (priority as string) || 'medium',
      description: (description as string) || '',
      assignedTo: (assignedTo as string) || '',
      scheduledDate: scheduledDate ? new Date(scheduledDate as string) : null,
      failureMode: (failureMode as string) || '',
      notes: notes as string,
    },
  });
  return created(item);
}

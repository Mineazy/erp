import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody, badRequest } from '@/lib/api';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const item = await prisma.erpWorkOrder.findUnique({
    where: { id: id },
    include: { parts: true },
  });
  if (!item) return notFound('Work order not found');
  return ok(item);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpWorkOrder.findUnique({ where: { id: id } });
  if (!existing) return notFound('Work order not found');

  const body = await getBody(request);
  const { equipmentId, type, priority, description, assignedTo, scheduledDate, completedAt, labourHours, labourCost, partsCost, totalCost, status, failureMode, downtimeHours, notes } = body;
  const parts = body.parts as any[];

  if (parts) {
    if (!parts.length) return badRequest('At least one part required');

    const lineData = parts.map((l: any) => ({
      productId: l.productId,
      productName: l.productName,
      quantity: parseFloat(l.quantity),
      unitCost: parseFloat(l.unitCost),
      totalCost: parseFloat(l.quantity) * parseFloat(l.unitCost),
    }));

    const totalPartsCost = lineData.reduce((sum: number, l: any) => sum + l.totalCost, 0);

    await prisma.erpWorkOrderPart.deleteMany({ where: { woId: id } });

    const item = await prisma.erpWorkOrder.update({
      where: { id: id },
      data: {
        ...(equipmentId !== undefined && { equipmentId: equipmentId as string }),
        ...(type !== undefined && { type: type as string }),
        ...(priority !== undefined && { priority: priority as string }),
        ...(description !== undefined && { description: description as string }),
        ...(assignedTo !== undefined && { assignedTo: assignedTo as string | null }),
        ...(scheduledDate !== undefined && { scheduledDate: scheduledDate ? new Date(scheduledDate as string) : null }),
        ...(completedAt !== undefined && { completedAt: completedAt ? new Date(completedAt as string) : null }),
        ...(labourHours !== undefined && { labourHours: parseFloat(labourHours as string) }),
        ...(labourCost !== undefined && { labourCost: parseFloat(labourCost as string) }),
        ...(partsCost !== undefined && { partsCost: parseFloat(partsCost as string) }),
        ...(totalCost !== undefined && { totalCost: parseFloat(totalCost as string) }),
        ...(status !== undefined && { status: status as string }),
        ...(failureMode !== undefined && { failureMode: failureMode as string | null }),
        ...(downtimeHours !== undefined && { downtimeHours: parseFloat(downtimeHours as string) }),
        ...(notes !== undefined && { notes: notes as string | null }),
        partsCost: totalPartsCost,
        parts: { create: lineData },
      },
      include: { parts: true },
    });

    return ok(item);
  }

  const item = await prisma.erpWorkOrder.update({
    where: { id: id },
    data: {
      ...(equipmentId !== undefined && { equipmentId: equipmentId as string }),
      ...(type !== undefined && { type: type as string }),
      ...(priority !== undefined && { priority: priority as string }),
      ...(description !== undefined && { description: description as string }),
      ...(assignedTo !== undefined && { assignedTo: assignedTo as string | null }),
      ...(scheduledDate !== undefined && { scheduledDate: scheduledDate ? new Date(scheduledDate as string) : null }),
      ...(completedAt !== undefined && { completedAt: completedAt ? new Date(completedAt as string) : null }),
      ...(labourHours !== undefined && { labourHours: parseFloat(labourHours as string) }),
      ...(labourCost !== undefined && { labourCost: parseFloat(labourCost as string) }),
      ...(partsCost !== undefined && { partsCost: parseFloat(partsCost as string) }),
      ...(totalCost !== undefined && { totalCost: parseFloat(totalCost as string) }),
      ...(status !== undefined && { status: status as string }),
      ...(failureMode !== undefined && { failureMode: failureMode as string | null }),
      ...(downtimeHours !== undefined && { downtimeHours: parseFloat(downtimeHours as string) }),
      ...(notes !== undefined && { notes: notes as string | null }),
    },
  });

  return ok(item);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpWorkOrder.findUnique({ where: { id: id } });
  if (!existing) return notFound('Work order not found');

  await prisma.erpWorkOrder.delete({ where: { id: id } });
  return ok({ success: true });
}

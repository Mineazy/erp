import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok, badRequest, getBody } from '@/lib/api';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { taskId } = await params;
  const extensions = await prisma.erpTaskExtension.findMany({
    where: { taskId },
    orderBy: { createdAt: 'desc' },
  });
  return ok(extensions);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { taskId } = await params;
  const body: any = await getBody(request);
  const { newDueDate, reason, additionalHours, additionalResources, additionalCost } = body;

  if (!newDueDate || !reason) return badRequest('New due date and reason are required');

  const task = await prisma.erpProjectTask.findUnique({ where: { id: taskId } });
  if (!task) return badRequest('Task not found');

  const userEmail = (session.user as any)?.email || 'unknown';
  const originalDueDate = task.dueDate || new Date();

  const extension = await prisma.erpTaskExtension.create({
    data: {
      taskId,
      originalDueDate,
      newDueDate: new Date(newDueDate),
      reason,
      additionalHours: additionalHours ? parseFloat(additionalHours) : null,
      additionalResources: additionalResources || null,
      additionalCost: additionalCost ? parseFloat(additionalCost) : null,
      status: 'approved',
      requestedBy: userEmail,
      approvedBy: userEmail,
    },
  });

  await prisma.erpProjectTask.update({
    where: { id: taskId },
    data: { dueDate: new Date(newDueDate) },
  });

  return ok(extension);
}

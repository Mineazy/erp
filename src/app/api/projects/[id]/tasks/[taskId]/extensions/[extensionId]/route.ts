import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok, badRequest, getBody, notFound } from '@/lib/api';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string; extensionId: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { extensionId } = await params;
  const body: any = await getBody(request);

  const existing = await prisma.erpTaskExtension.findUnique({ where: { id: extensionId } });
  if (!existing) return notFound('Extension not found');

  const data: any = {};
  if (body.status) data.status = body.status;
  if (body.approvedBy) data.approvedBy = body.approvedBy;
  if (body.actualHours !== undefined) data.actualHours = body.actualHours ? parseFloat(body.actualHours) : null;
  if (body.actualCompletionDate) data.actualCompletionDate = new Date(body.actualCompletionDate);
  if (body.notes !== undefined) data.notes = body.notes;

  if (body.status === 'approved' && body.newDueDate) {
    data.newDueDate = new Date(body.newDueDate);
    await prisma.erpProjectTask.update({
      where: { id: existing.taskId },
      data: { dueDate: new Date(body.newDueDate) },
    });
  }

  const extension = await prisma.erpTaskExtension.update({
    where: { id: extensionId },
    data,
  });

  return ok(extension);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string; extensionId: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { extensionId } = await params;

  const existing = await prisma.erpTaskExtension.findUnique({ where: { id: extensionId } });
  if (!existing) return notFound('Extension not found');

  await prisma.erpTaskExtension.delete({ where: { id: extensionId } });
  return ok({ deleted: true });
}

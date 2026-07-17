import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody } from '@/lib/api';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpAlert.findUnique({ where: { id } });
  if (!existing) return notFound('Alert not found');

  const body = await getBody(request);
  const isRead = body.isRead;

  const updated = await prisma.erpAlert.update({
    where: { id },
    data: {
      ...(isRead !== undefined && { isRead: isRead as boolean, readAt: isRead ? new Date() : null }),
    },
  });

  return ok(updated);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpAlert.findUnique({ where: { id } });
  if (!existing) return notFound('Alert not found');

  await prisma.erpAlert.delete({ where: { id } });
  return ok({ success: true });
}

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody } from '@/lib/api';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const item = await prisma.erpStockAdjustment.findUnique({ where: { id } });
  if (!item) return notFound('Stock adjustment not found');

  return ok(item);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpStockAdjustment.findUnique({ where: { id } });
  if (!existing) return notFound('Stock adjustment not found');

  const body = await getBody(request);
  const { reason, notes } = body;

  const updated = await prisma.erpStockAdjustment.update({
    where: { id },
    data: {
      ...(reason !== undefined && { reason: reason as string }),
      ...(notes !== undefined && { notes: notes as string }),
    },
  });

  return ok(updated);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpStockAdjustment.findUnique({ where: { id } });
  if (!existing) return notFound('Stock adjustment not found');

  await prisma.erpStockAdjustment.delete({ where: { id } });
  return ok({ success: true });
}

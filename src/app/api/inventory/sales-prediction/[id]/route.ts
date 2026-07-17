import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok } from '@/lib/api';

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpSalesPrediction.findUnique({ where: { id } });
  if (!existing) return notFound('Sales prediction not found');

  await prisma.erpSalesPrediction.delete({ where: { id } });
  return ok({ success: true });
}

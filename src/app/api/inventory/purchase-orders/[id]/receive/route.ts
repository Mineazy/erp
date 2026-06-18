import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok } from '@/lib/api';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const order = await prisma.erpPurchaseOrder.findUnique({ where: { id: id } });
  if (!order) return notFound('Purchase order not found');

  const updated = await prisma.erpPurchaseOrder.update({
    where: { id: id },
    data: { status: 'received' },
  });

  return ok(updated);
}

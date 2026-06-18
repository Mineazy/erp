import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok } from '@/lib/api';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const order = await prisma.erpSalesOrder.findUnique({ where: { id: id } });
  if (!order) return notFound('Sales order not found');

  const updated = await prisma.erpSalesOrder.update({
    where: { id: id },
    data: { status: 'cancelled' },
  });

  return ok(updated);
}

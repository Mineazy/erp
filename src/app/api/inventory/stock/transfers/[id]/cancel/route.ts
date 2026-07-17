import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok } from '@/lib/api';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const transfer = await prisma.erpStockTransfer.findUnique({ where: { id } });
  if (!transfer) return notFound('Stock transfer not found');

  const updated = await prisma.erpStockTransfer.update({
    where: { id },
    data: { status: 'cancelled' },
  });

  return ok(updated);
}

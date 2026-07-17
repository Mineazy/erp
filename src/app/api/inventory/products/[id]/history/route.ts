import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok } from '@/lib/api';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const product = await prisma.erpProduct.findUnique({ where: { id } });
  if (!product) return notFound('Product not found');

  const history = await prisma.erpProductHistory.findMany({
    where: { productId: id },
    orderBy: { createdAt: 'desc' },
  });

  return ok(history);
}

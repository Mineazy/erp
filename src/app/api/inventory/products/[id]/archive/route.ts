import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok } from '@/lib/api';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const product = await prisma.erpProduct.findUnique({ where: { id } });
  if (!product) return notFound('Product not found');

  const updated = await prisma.erpProduct.update({
    where: { id },
    data: { isActive: !product.isActive },
  });

  await prisma.erpProductHistory.create({
    data: {
      productId: id,
      productName: product.name,
      field: 'isActive',
      oldValue: String(product.isActive),
      newValue: String(!product.isActive),
      action: 'archive',
      userId: (session.user as any).email || 'unknown',
      userName: (session.user as any).name || null,
    },
  });

  return ok(updated);
}

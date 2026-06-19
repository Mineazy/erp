import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getNextSequence } from '@/lib/api';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const order = await prisma.erpPurchaseOrder.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!order) return notFound('Purchase order not found');

  for (const line of order.lines) {
    await prisma.erpProduct.update({
      where: { id: line.productId },
      data: { stock: { increment: line.quantity } },
    });
    const movementNo = await getNextSequence(prisma, 'erpStockMovement', 'movementNo', 'MOV');
    await prisma.erpStockMovement.create({
      data: {
        movementNo,
        type: 'in',
        productId: line.productId,
        productName: line.productName,
        quantity: line.quantity,
        referenceType: 'purchase_order',
        referenceId: id,
        userId: (session.user as any).email || 'unknown',
      },
    });
  }

  const updated = await prisma.erpPurchaseOrder.update({
    where: { id },
    data: { status: 'received' },
  });

  return ok(updated);
}

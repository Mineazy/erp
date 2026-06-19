import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, badRequest, ok, getNextSequence } from '@/lib/api';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const order = await prisma.erpSalesOrder.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!order) return notFound('Sales order not found');

  for (const line of order.lines) {
    const product = await prisma.erpProduct.findUnique({ where: { id: line.productId } });
    if (!product || Number(product.stock) < Number(line.quantity)) {
      return badRequest(`Insufficient stock for ${line.productName}`);
    }
  }

  for (const line of order.lines) {
    await prisma.erpProduct.update({
      where: { id: line.productId },
      data: { stock: { decrement: line.quantity } },
    });
    const movementNo = await getNextSequence(prisma, 'erpStockMovement', 'movementNo', 'MOV');
    await prisma.erpStockMovement.create({
      data: {
        movementNo,
        type: 'out',
        productId: line.productId,
        productName: line.productName,
        quantity: line.quantity,
        referenceType: 'sales_order',
        referenceId: id,
        userId: (session.user as any).email || 'unknown',
      },
    });
  }

  const updated = await prisma.erpSalesOrder.update({
    where: { id },
    data: { status: 'confirmed' },
  });

  return ok(updated);
}

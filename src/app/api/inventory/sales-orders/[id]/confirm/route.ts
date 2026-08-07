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

  if (!order.branchId) return badRequest('Sales order has no branch assigned');

  for (const line of order.lines) {
    const branchStock = await prisma.erpBranchStock.findUnique({
      where: { branchId_productId: { branchId: order.branchId, productId: line.productId } }
    });
    if (!branchStock || Number(branchStock.quantity) < Number(line.quantity)) {
      return badRequest(`Insufficient stock for ${line.productName}`);
    }
  }

  for (const line of order.lines) {
    await prisma.erpBranchStock.update({
      where: { branchId_productId: { branchId: order.branchId, productId: line.productId } },
      data: { quantity: { decrement: line.quantity } },
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
        branchId: order.branchId,
      },
    });
  }

  const updated = await prisma.erpSalesOrder.update({
    where: { id },
    data: { status: 'confirmed' },
  });

  return ok(updated);
}

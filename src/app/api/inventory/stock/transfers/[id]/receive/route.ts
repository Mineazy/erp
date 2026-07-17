import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getNextSequence } from '@/lib/api';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const transfer = await prisma.erpStockTransfer.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!transfer) return notFound('Stock transfer not found');
  if (transfer.status !== 'in_transit') {
    return notFound('Transfer can only be received when in_transit');
  }

  const userEmail = (session.user as any).email || 'unknown';

  for (const line of transfer.lines) {
    const outMovementNo = await getNextSequence(prisma, 'erpStockMovement', 'movementNo', 'MOV');
    await prisma.erpStockMovement.create({
      data: {
        movementNo: outMovementNo,
        type: 'transfer_out',
        productId: line.productId,
        productName: line.productName,
        quantity: line.quantity,
        fromWarehouseId: transfer.fromBranchId,
        toWarehouseId: transfer.toBranchId,
        referenceType: 'stock_transfer',
        referenceId: id,
        notes: `Transfer from branch`,
        userId: userEmail,
        branchId: transfer.fromBranchId,
      },
    });

    const inMovementNo = await getNextSequence(prisma, 'erpStockMovement', 'movementNo', 'MOV');
    await prisma.erpStockMovement.create({
      data: {
        movementNo: inMovementNo,
        type: 'transfer_in',
        productId: line.productId,
        productName: line.productName,
        quantity: line.quantity,
        fromWarehouseId: transfer.fromBranchId,
        toWarehouseId: transfer.toBranchId,
        referenceType: 'stock_transfer',
        referenceId: id,
        notes: `Transfer to branch`,
        userId: userEmail,
        branchId: transfer.toBranchId,
      },
    });
  }

  const updated = await prisma.erpStockTransfer.update({
    where: { id },
    data: {
      status: 'received',
      receivedBy: userEmail,
      receivedAt: new Date(),
    },
  });

  return ok(updated);
}

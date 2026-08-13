import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, badRequest, ok, getNextSequence } from '@/lib/api';

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
    return badRequest('Transfer can only be received when in_transit');
  }

  const userEmail = (session.user as any).email || 'unknown';

  const result = await prisma.$transaction(async (tx) => {
    const l99 = await tx.erpWarehouse.findUnique({ where: { code: 'L99' } });
    if (!l99) throw new Error('L99 Transit Warehouse not found');

    for (const line of transfer.lines) {
      const quantity = Number(line.quantity);
      const destIdentifier = transfer.toBranchId || transfer.toWarehouseId || 'unknown_dest';
      const transitBatchNo = `L99-${destIdentifier}-${line.batchNo || 'std'}`;

      // 1. Deduct from L99 Transit Warehouse
      await tx.erpWarehouseStock.update({
        where: { warehouseId_productId_batchNo: { warehouseId: l99.id, productId: line.productId, batchNo: transitBatchNo } },
        data: { quantity: { decrement: quantity } }
      });

      // 2. Add to destination (Warehouse or Branch)
      if (transfer.toWarehouseId) {
        await tx.erpWarehouseStock.upsert({
          where: { warehouseId_productId_batchNo: { warehouseId: transfer.toWarehouseId, productId: line.productId, batchNo: line.batchNo || '' } },
          create: { warehouseId: transfer.toWarehouseId, productId: line.productId, quantity: quantity, batchNo: line.batchNo || '' },
          update: { quantity: { increment: quantity } }
        });
      } else if (transfer.toBranchId) {
        await tx.erpBranchStock.upsert({
          where: { branchId_productId: { branchId: transfer.toBranchId, productId: line.productId } },
          create: { branchId: transfer.toBranchId, productId: line.productId, quantity: quantity },
          update: { quantity: { increment: quantity } }
        });
      }

      // 3. Log stock movement IN
      const inMovementNo = await getNextSequence(tx as any, 'erpStockMovement', 'movementNo', 'MOV');
      await tx.erpStockMovement.create({
        data: {
          movementNo: inMovementNo,
          type: 'transfer_in',
          productId: line.productId,
          productName: line.productName,
          quantity: quantity,
          fromWarehouseId: l99.id, // Moving from L99
          toWarehouseId: transfer.toBranchId || transfer.toWarehouseId, 
          referenceType: 'stock_transfer',
          referenceId: id,
          notes: `Received from L99 Transit for transfer ${transfer.transferNo}`,
          userId: userEmail,
          branchId: transfer.toBranchId,
        },
      });
    }

    // 4. Update Transfer Status
    const updated = await tx.erpStockTransfer.update({
      where: { id },
      data: {
        status: 'received',
        receivedBy: userEmail,
        receivedAt: new Date(),
      },
    });

    return updated;
  });

  return ok(result);
}

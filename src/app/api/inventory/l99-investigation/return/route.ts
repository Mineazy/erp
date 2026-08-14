import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, badRequest, ok, getBody, getNextSequence } from '@/lib/api';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { transferId, linesToReturn, targetWarehouseId, notes } = body;

  if (!transferId || !linesToReturn || !Array.isArray(linesToReturn) || !targetWarehouseId) {
    return badRequest('transferId, linesToReturn, and targetWarehouseId are required');
  }

  const userEmail = (session.user as any).email || 'unknown';

  const result = await prisma.$transaction(async (tx) => {
    const transfer = await tx.erpStockTransfer.findUnique({
      where: { id: String(transferId) },
      include: { lines: true }
    });

    if (!transfer) throw new Error('Transfer not found');
    
    const l99 = await tx.erpWarehouse.findUnique({ where: { code: 'L99' } });
    if (!l99) throw new Error('L99 Transit Warehouse not found');

    const targetWarehouse = await tx.erpWarehouse.findUnique({ where: { id: targetWarehouseId as string } });
    if (!targetWarehouse) throw new Error('Target warehouse not found');

    for (const returnLine of linesToReturn) {
      const { lineId, returnQty } = returnLine;
      const qty = Number(returnQty);
      if (qty <= 0) continue;

      const transferLine = transfer.lines.find(l => l.id === lineId);
      if (!transferLine) throw new Error(`Line ${lineId} not found in transfer`);

      const destIdentifier = transfer.toBranchId || transfer.toWarehouseId || 'unknown_dest';
      const transitBatchNo = `L99-${destIdentifier}-${transferLine.batchNo || 'std'}`;

      const l99Stock = await tx.erpWarehouseStock.findUnique({
        where: { warehouseId_productId_batchNo: { warehouseId: l99.id, productId: transferLine.productId, batchNo: transitBatchNo } }
      });

      if (!l99Stock || Number(l99Stock.quantity) < qty) {
        throw new Error(`Insufficient quantity in L99 for product ${transferLine.productName}`);
      }

      await tx.erpWarehouseStock.update({
        where: { id: l99Stock.id },
        data: { quantity: { decrement: qty } }
      });

      const targetBatchNo = transferLine.batchNo || '';
      await tx.erpWarehouseStock.upsert({
        where: { warehouseId_productId_batchNo: { warehouseId: targetWarehouseId as string, productId: transferLine.productId, batchNo: targetBatchNo } },
        create: { warehouseId: targetWarehouseId as string, productId: transferLine.productId, quantity: qty, batchNo: targetBatchNo },
        update: { quantity: { increment: qty } }
      });

      const movementNo = await getNextSequence(tx as any, 'erpStockMovement', 'movementNo', 'MOV');
      await tx.erpStockMovement.create({
        data: {
          movementNo,
          type: 'transfer_in',
          productId: transferLine.productId,
          productName: transferLine.productName,
          quantity: qty,
          fromWarehouseId: l99.id,
          toWarehouseId: targetWarehouseId as string,
          referenceType: 'l99_investigation_return',
          referenceId: String(transferId),
          notes: notes ? String(notes) : `Returned from L99 Transit to ${targetWarehouse.name}`,
          userId: userEmail,
        }
      });
    }

    await tx.erpStockTransfer.update({
      where: { id: String(transferId) },
      data: { status: 'returned' }
    });

    return { success: true };
  });

  return ok(result);
}

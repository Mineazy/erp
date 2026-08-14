import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, badRequest, ok, getBody, getNextSequence } from '@/lib/api';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { warehouseStockId, quantityToReturn, targetWarehouseId, notes } = body;

  if (!warehouseStockId || !quantityToReturn || !targetWarehouseId) {
    return badRequest('warehouseStockId, quantityToReturn, and targetWarehouseId are required');
  }

  const userEmail = (session.user as any).email || 'unknown';
  const qty = Number(quantityToReturn);
  if (qty <= 0) return badRequest('Quantity must be greater than 0');

  const result = await prisma.$transaction(async (tx) => {
    const stockId = warehouseStockId as string;
    const l99Stock = await tx.erpWarehouseStock.findUnique({
      where: { id: stockId }
    });

    if (!l99Stock) throw new Error('Stock record not found in L99');
    if (Number(l99Stock.quantity) < qty) throw new Error('Insufficient quantity in L99 Transit');

    const targetWarehouse = await tx.erpWarehouse.findUnique({ where: { id: targetWarehouseId as string } });
    if (!targetWarehouse) throw new Error('Target warehouse not found');

    const product = await tx.erpProduct.findUnique({ where: { id: l99Stock.productId } });
    const productName = product ? product.name : l99Stock.productId;

    // 1. Deduct from L99
    await tx.erpWarehouseStock.update({
      where: { id: stockId },
      data: { quantity: { decrement: qty } }
    });

    // 2. We need to normalize the batchNo if it was encoded with the destination
    // e.g. L99-[dest]-std -> std.
    let targetBatchNo = l99Stock.batchNo || '';
    if (targetBatchNo.startsWith('L99-')) {
      const parts = targetBatchNo.split('-');
      if (parts.length >= 3) {
        targetBatchNo = parts.slice(2).join('-');
      } else {
        targetBatchNo = '';
      }
    }

    // 3. Add to Target Warehouse
    await tx.erpWarehouseStock.upsert({
      where: { warehouseId_productId_batchNo: { warehouseId: targetWarehouseId as string, productId: l99Stock.productId, batchNo: targetBatchNo } },
      create: { warehouseId: targetWarehouseId as string, productId: l99Stock.productId, quantity: qty, batchNo: targetBatchNo },
      update: { quantity: { increment: qty } }
    });

    // 4. Log movement
    const movementNo = await getNextSequence(tx as any, 'erpStockMovement', 'movementNo', 'MOV');
    await tx.erpStockMovement.create({
      data: {
        movementNo,
        type: 'transfer_in',
        productId: l99Stock.productId,
        productName: productName,
        quantity: qty,
        fromWarehouseId: l99Stock.warehouseId,
        toWarehouseId: targetWarehouseId as string,
        referenceType: 'l99_investigation_return',
        notes: notes ? String(notes) : `Returned from L99 Transit to ${targetWarehouse.name}`,
        userId: userEmail,
      }
    });

    return { success: true };
  });

  return ok(result);
}

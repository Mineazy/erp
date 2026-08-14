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
  if (transfer.status !== 'draft' && transfer.status !== 'pending') {
    return badRequest('Transfer can only be sent when in draft or pending status');
  }

  const userEmail = (session.user as any).email || 'unknown';

  const result = await prisma.$transaction(async (tx) => {
    // 1. Ensure L99 Transit Warehouse exists
    let l99 = await tx.erpWarehouse.findUnique({ where: { code: 'L99' } });
    if (!l99) {
      l99 = await tx.erpWarehouse.create({
        data: {
          code: 'L99',
          name: 'L99 Transit Warehouse',
          type: 'transit',
          location: 'Virtual Transit',
        }
      });
    }

    // 2. Process each line
    for (const line of transfer.lines) {
      const quantity = Number(line.quantity);

      // Deduct from sender (Warehouse or Branch)
      if (transfer.fromWarehouseId) {
        await tx.erpWarehouseStock.upsert({
          where: { warehouseId_productId_batchNo: { warehouseId: transfer.fromWarehouseId, productId: line.productId, batchNo: line.batchNo || '' } },
          create: { warehouseId: transfer.fromWarehouseId, productId: line.productId, quantity: -quantity, batchNo: line.batchNo || '' },
          update: { quantity: { decrement: quantity } }
        });
      } else if (transfer.fromBranchId) {
        await tx.erpBranchStock.upsert({
          where: { branchId_productId: { branchId: transfer.fromBranchId, productId: line.productId } },
          create: { branchId: transfer.fromBranchId, productId: line.productId, quantity: -quantity },
          update: { quantity: { decrement: quantity } }
        });
      }

      // Add to L99 Transit Warehouse, with location = toBranchId to disaggregate
      const destIdentifier = transfer.toBranchId || transfer.toWarehouseId || 'unknown_dest';
      
      // Since ErpWarehouseStock unique constraint is [warehouseId, productId, batchNo],
      // and we need to disaggregate by destination branch, we can encode the destination in the batchNo 
      // or we just rely on location field. But wait! If we rely on location field, upsert might fail if two branches
      // have the same product in L99 and the unique constraint doesn't include location!
      // The schema for ErpWarehouseStock is: @@unique([warehouseId, productId, batchNo])
      // So to disaggregate by branch in L99, we MUST include the destination branch ID in the batchNo!
      const transitBatchNo = `L99-${destIdentifier}-${line.batchNo || 'std'}`;

      await tx.erpWarehouseStock.upsert({
        where: { warehouseId_productId_batchNo: { warehouseId: l99.id, productId: line.productId, batchNo: transitBatchNo } },
        create: { warehouseId: l99.id, productId: line.productId, quantity, location: destIdentifier, batchNo: transitBatchNo },
        update: { quantity: { increment: quantity }, location: destIdentifier }
      });

      // 3. Log stock movement OUT
      const outMovementNo = await getNextSequence(tx as any, 'erpStockMovement', 'movementNo', 'MOV');
      await tx.erpStockMovement.create({
        data: {
          movementNo: outMovementNo,
          type: 'transfer_out',
          productId: line.productId,
          productName: line.productName,
          quantity: quantity,
          fromWarehouseId: transfer.fromBranchId || transfer.fromWarehouseId,
          toWarehouseId: l99.id, // Moving to L99
          referenceType: 'stock_transfer',
          referenceId: id,
          notes: `Sent to L99 Transit for destination ${destIdentifier}`,
          userId: userEmail,
          branchId: transfer.fromBranchId,
        },
      });
    }

    // 4. Update Transfer Status
    const updated = await tx.erpStockTransfer.update({
      where: { id },
      data: {
        status: 'in_transit',
      },
    });

    return updated;
  });

  return ok(result);
}

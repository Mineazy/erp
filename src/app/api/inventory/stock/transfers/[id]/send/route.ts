import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, badRequest, ok, getNextSequence, getBody } from '@/lib/api';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  // Accept sent quantities from request body
  let sentLines: { lineId: string; sentQty: number }[] = [];
  try {
    const body = await getBody(request);
    if (body.sentLines && Array.isArray(body.sentLines)) {
      sentLines = body.sentLines;
    }
  } catch {}

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

    // Track short-shipments for back order creation
    const shortShipments: { productId: string; productName: string; requestedQty: number; sentQty: number }[] = [];

    // 2. Process each line
    for (const line of transfer.lines) {
      const requestedQty = Number(line.quantity);
      // Use sent qty if provided, otherwise fall back to ordered qty
      const sentEntry = sentLines.find(s => s.lineId === line.id);
      const quantity = sentEntry ? Number(sentEntry.sentQty) : requestedQty;

      // Update sentQty on the line
      if (sentEntry) {
        await tx.erpStockTransferLine.update({
          where: { id: line.id },
          data: { sentQty: sentEntry.sentQty },
        });

        // Check for short-shipment
        if (Number(sentEntry.sentQty) < requestedQty) {
          shortShipments.push({
            productId: line.productId,
            productName: line.productName,
            requestedQty,
            sentQty: Number(sentEntry.sentQty),
          });
        }
      }

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

      // Add to L99 Transit Warehouse
      const destIdentifier = transfer.toBranchId || transfer.toWarehouseId || 'unknown_dest';
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
          toWarehouseId: l99.id,
          referenceType: 'stock_transfer',
          referenceId: id,
          notes: `Sent to L99 Transit for destination ${destIdentifier}`,
          userId: userEmail,
          branchId: transfer.fromBranchId,
        },
      });
    }

    // 4. Auto-create Back Order for short-shipments
    if (shortShipments.length > 0 && transfer.toBranchId) {
      const backOrderNo = await getNextSequence(tx as any, 'erpBackOrder', 'orderNumber', 'BO');
      await tx.erpBackOrder.create({
        data: {
          orderNumber: backOrderNo,
          branchId: transfer.toBranchId,
          status: 'submitted',
          requestedBy: userEmail,
          notes: `Auto-generated: Short-shipment on transfer ${transfer.transferNo}`,
          lines: {
            create: shortShipments.map(s => ({
              productId: s.productId,
              productName: s.productName,
              requestedQty: s.requestedQty - s.sentQty,
              allocatedQty: 0,
              outstandingQty: s.requestedQty - s.sentQty,
              status: 'pending',
            })),
          },
        },
      });
    }

    // 5. Update Transfer Status
    const updated = await tx.erpStockTransfer.update({
      where: { id },
      data: {
        status: 'in_transit',
      },
    });

    return { ...updated, backOrderCreated: shortShipments.length > 0 };
  });

  return ok(result);
}

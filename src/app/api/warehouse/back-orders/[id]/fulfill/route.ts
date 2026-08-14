import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, badRequest, getBody, getNextSequence } from '@/lib/api';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const userEmail = (session.user as any).email || 'unknown';
  const body = await getBody(request);
  const fulfillLines = (body.lines as Array<{ lineId: string; fulfillQty: number }>) || [];

  if (!fulfillLines.length) return badRequest('No items to fulfill');

  const backOrder = await prisma.erpBackOrder.findUnique({
    where: { id },
    include: { lines: true },
  });

  if (!backOrder) return notFound('Back order not found');
  if (['closed', 'fulfilled'].includes(backOrder.status)) return badRequest('Back order is already closed/fulfilled');

  const dcWarehouse = await prisma.erpWarehouse.findFirst({
    where: { OR: [{ code: 'DC' }, { name: { contains: 'DC Warehouse' } }] }
  });

  if (!dcWarehouse) return badRequest('DC Warehouse not found. Ensure DC Warehouse exists.');

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create a Draft Stock Transfer for these items
    const transferNo = await getNextSequence(tx as any, 'erpStockTransfer', 'transferNo', 'TRF');
    
    const transfer = await tx.erpStockTransfer.create({
      data: {
        transferNo,
        fromWarehouseId: dcWarehouse.id,
        toBranchId: backOrder.branchId,
        status: 'draft',
        requestedBy: userEmail,
        notes: `Auto-generated from Back Order ${backOrder.orderNumber}`,
      }
    });

    let anyPending = false;
    let anyAllocated = false;

    // 2. Process each line
    for (const fl of fulfillLines) {
      if (fl.fulfillQty <= 0) continue;

      const line = backOrder.lines.find(l => l.id === fl.lineId);
      if (!line) continue;

      const newAllocatedQty = Number(line.allocatedQty) + fl.fulfillQty;
      const newOutstandingQty = Number(line.requestedQty) - newAllocatedQty;

      // Update back order line
      await tx.erpBackOrderLine.update({
        where: { id: line.id },
        data: {
          allocatedQty: newAllocatedQty,
          outstandingQty: Math.max(0, newOutstandingQty),
          status: newOutstandingQty <= 0 ? 'allocated' : 'partially_allocated'
        }
      });

      // Create transfer line
      await tx.erpStockTransferLine.create({
        data: {
          transferId: transfer.id,
          productId: line.productId,
          productName: line.productName,
          quantity: fl.fulfillQty,
        }
      });

      anyAllocated = true;
    }

    if (!anyAllocated) {
      throw new Error("No items were allocated");
    }

    // 3. Check overall Back Order status
    const updatedLines = await tx.erpBackOrderLine.findMany({ where: { backOrderId: id } });
    const allAllocated = updatedLines.every(l => Number(l.outstandingQty) <= 0);
    const hasAnyAllocated = updatedLines.some(l => Number(l.allocatedQty) > 0);

    const newStatus = allAllocated ? 'allocated' : (hasAnyAllocated ? 'partially_allocated' : backOrder.status);

    await tx.erpBackOrder.update({
      where: { id },
      data: { status: newStatus }
    });

    return { transferId: transfer.id, newStatus };
  });

  return NextResponse.json({ success: true, result });
}

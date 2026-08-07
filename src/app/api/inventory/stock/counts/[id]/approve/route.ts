import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getNextSequence } from '@/lib/api';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const count = await prisma.erpInventoryCount.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!count) return notFound('Inventory count not found');
  if (count.status !== 'completed') return notFound('Count must be completed before approval');

  const userEmail = (session.user as any).email || 'unknown';

  for (const line of count.lines) {
    const variance = Number(line.variance);
    if (variance === 0) continue;

    const qty = Math.abs(variance);
    const adjustmentType = variance > 0 ? 'adjustment' : 'loss';

    const adjustmentNo = await getNextSequence(prisma, 'erpStockAdjustment', 'adjustmentNo', 'ADJ');
    await prisma.erpStockAdjustment.create({
      data: {
        adjustmentNo,
        productId: line.productId,
        productName: line.productName,
        adjustmentType,
        quantity: qty,
        currentStock: Number(line.systemQty),
        newStock: Number(line.countedQty),
        reason: `Inventory count adjustment (variance: ${variance > 0 ? '+' : ''}${line.variance})`,
        referenceType: 'inventory_count',
        referenceId: id,
        notes: line.notes || null,
        userId: userEmail,
        branchId: count.branchId,
      },
    });

    if (count.branchId) {
      await prisma.erpBranchStock.upsert({
        where: { branchId_productId: { branchId: count.branchId, productId: line.productId } },
        create: { branchId: count.branchId, productId: line.productId, quantity: variance },
        update: { quantity: { increment: variance } },
      });
    }

    const movementNo = await getNextSequence(prisma, 'erpStockMovement', 'movementNo', 'MOV');
    await prisma.erpStockMovement.create({
      data: {
        movementNo,
        type: variance > 0 ? 'in' : 'out',
        productId: line.productId,
        productName: line.productName,
        quantity: qty,
        referenceType: 'inventory_count',
        referenceId: id,
        notes: `Count adjustment (${count.countNo})`,
        userId: userEmail,
        branchId: count.branchId,
      },
    });
  }

  const updated = await prisma.erpInventoryCount.update({
    where: { id },
    data: {
      status: 'approved',
      approvedBy: userEmail,
      approvedAt: new Date(),
    },
    include: { lines: true },
  });

  return ok(updated);
}

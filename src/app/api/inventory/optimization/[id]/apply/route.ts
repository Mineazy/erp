import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getNextSequence } from '@/lib/api';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const opt = await prisma.erpInventoryOptimization.findUnique({ where: { id } });
  if (!opt) return notFound('Optimization recommendation not found');
  if (opt.isApplied) return notFound('Recommendation already applied');

  const userEmail = (session.user as any).email || 'unknown';

  const product = await prisma.erpProduct.findUnique({ where: { id: opt.productId } });
  if (!product) return notFound('Product not found');

  let currentStock = 0;
  if (opt.branchId) {
    const bs = await prisma.erpBranchStock.findUnique({ where: { branchId_productId: { branchId: opt.branchId, productId: opt.productId } } });
    if (bs) currentStock = Number(bs.quantity);
  }

  const qty = Number(opt.suggestedQty);
  const isReduction = opt.suggestedAction.toLowerCase().includes('reduce') || opt.suggestedAction.toLowerCase().includes('dispose');
  const adjustmentType = isReduction ? 'reduction' : 'addition';
  const newStock = isReduction ? Math.max(0, currentStock - qty) : currentStock + qty;

  const adjustmentNo = await getNextSequence(prisma, 'erpStockAdjustment', 'adjustmentNo', 'ADJ');
  await prisma.erpStockAdjustment.create({
    data: {
      adjustmentNo,
      productId: opt.productId,
      productName: opt.productName,
      adjustmentType,
      quantity: qty,
      currentStock,
      newStock,
      reason: `Applied optimization: ${opt.recommendationType} - ${opt.reason}`,
      referenceType: 'optimization',
      referenceId: id,
      userId: userEmail,
      branchId: opt.branchId,
    },
  });

  if (opt.branchId) {
    await prisma.erpBranchStock.upsert({
      where: { branchId_productId: { branchId: opt.branchId, productId: opt.productId } },
      create: { branchId: opt.branchId, productId: opt.productId, quantity: newStock },
      update: { quantity: newStock },
    });
  }

  const movementNo = await getNextSequence(prisma, 'erpStockMovement', 'movementNo', 'MOV');
  await prisma.erpStockMovement.create({
    data: {
      movementNo,
      type: isReduction ? 'out' : 'in',
      productId: opt.productId,
      productName: opt.productName,
      quantity: qty,
      referenceType: 'optimization',
      referenceId: id,
      userId: userEmail,
      branchId: opt.branchId,
    },
  });

  const updated = await prisma.erpInventoryOptimization.update({
    where: { id },
    data: { isApplied: true },
  });

  return ok(updated);
}

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const now = new Date();
  const currentYearStart = new Date(now.getFullYear(), 0, 1);

  // Total PO Volume
  const poTotal = await prisma.erpPurchaseOrder.aggregate({
    where: { status: { not: 'cancelled' }, createdAt: { gte: currentYearStart } },
    _sum: { totalAmount: true }
  });
  const totalVolumeYTD = Number(poTotal._sum.totalAmount || 0);

  // Active POs
  const activePOs = await prisma.erpPurchaseOrder.count({
    where: { status: { in: ['approved', 'ordered', 'partial'] } }
  });

  // Pending Requisitions
  const pendingReqs = await prisma.erpPurchaseRequisition.count({
    where: { status: 'pending_approval' }
  });

  // On-Time Supplier Rate (Mocked for now since delivery tracking logic is complex)
  const onTimeRate = 94.5;

  return ok({
    metrics: {
      totalVolumeYTD,
      activePOs,
      pendingReqs,
      onTimeRate
    }
  });
}

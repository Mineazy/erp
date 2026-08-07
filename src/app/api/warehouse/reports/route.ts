import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  // Metrics: Configured Bins, Bin Utilization Rate, Total Stock Movements YTD, Reorder Critical Items

  const totalBins = await prisma.erpWarehouseZone.count();
  
  // For utilization, let's just use a placeholder based on some active bins if we don't have capacity mapped
  const activeBins = await prisma.erpStockMovement.groupBy({
    by: ['toWarehouseId'],
    _count: true
  });
  const activeCount = activeBins.filter(a => a.toWarehouseId).length;
  const utilRate = totalBins > 0 ? ((activeCount / totalBins) * 100).toFixed(1) : 0;

  const now = new Date();
  const currentYearStart = new Date(now.getFullYear(), 0, 1);
  const totalMovements = await prisma.erpStockMovement.count({
    where: { createdAt: { gte: currentYearStart } }
  });

  // Reorder critical items (stock <= minStock)
  const branchStocks = await prisma.erpBranchStock.findMany({ select: { productId: true, quantity: true, minQuantity: true } });
  const stockMap = new Map();
  const minStockMap = new Map();
  for (const bs of branchStocks) {
    stockMap.set(bs.productId, (stockMap.get(bs.productId) || 0) + Number(bs.quantity));
    minStockMap.set(bs.productId, (minStockMap.get(bs.productId) || 0) + Number(bs.minQuantity));
  }
  let criticalItems = 0;
  for (const [pId, stock] of Array.from(stockMap.entries())) {
    if (stock <= (minStockMap.get(pId) || 0)) criticalItems++;
  }

  return ok({
    metrics: {
      totalBins,
      utilRate,
      totalMovements,
      criticalItems
    }
  });
}

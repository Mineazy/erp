import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  // Metrics: Configured Bins, Bin Utilization Rate, Total Stock Movements YTD, Reorder Critical Items

  const totalBins = await prisma.erpBinLocation.count();
  
  // For utilization, let's just use a placeholder based on some active bins if we don't have capacity mapped
  const activeBins = await prisma.erpInventoryMovement.groupBy({
    by: ['binId'],
    _count: true
  });
  const utilRate = totalBins > 0 ? ((activeBins.length / totalBins) * 100).toFixed(1) : 0;

  const now = new Date();
  const currentYearStart = new Date(now.getFullYear(), 0, 1);
  const totalMovements = await prisma.erpInventoryMovement.count({
    where: { date: { gte: currentYearStart } }
  });

  // Reorder critical items (stock <= minStock)
  const items = await prisma.erpInventory.findMany({ select: { stock: true, minStock: true } });
  const criticalItems = items.filter(i => Number(i.stock) <= Number(i.minStock)).length;

  return ok({
    metrics: {
      totalBins,
      utilRate,
      totalMovements,
      criticalItems
    }
  });
}

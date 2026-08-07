import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok } from '@/lib/api';

export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const [totalProducts, stockAgg, outOfStockCount, recentMovements, branches] = await Promise.all([
    prisma.erpProduct.count(),
    prisma.erpBranchStock.aggregate({ _sum: { quantity: true } }),
    prisma.erpBranchStock.count({ where: { quantity: 0, product: { isActive: true } } }),
    prisma.erpStockMovement.count({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.erpBranch.findMany({ select: { id: true, name: true } }),
  ]);

  const stocks = await prisma.erpBranchStock.findMany({
    where: { product: { isActive: true } },
    select: { quantity: true, minQuantity: true, branchId: true, productId: true, product: { select: { costPrice: true } } },
  });

  const lowStockCount = stocks.filter((s) => Number(s.quantity) > 0 && Number(s.quantity) <= Number(s.minQuantity)).length;
  const totalStockQty = stockAgg._sum.quantity || 0;
  const totalInventoryValue = stocks.reduce((sum, s) => sum + Number(s.quantity) * Number(s.product.costPrice), 0);

  const branchMap = new Map<string, { id: string; branch: string; productCount: number; stockQty: number; value: number }>();
  for (const b of branches) {
    branchMap.set(b.id, { id: b.id, branch: b.name, productCount: 0, stockQty: 0, value: 0 });
  }
  for (const s of stocks) {
    if (s.branchId && branchMap.has(s.branchId)) {
      const b = branchMap.get(s.branchId)!;
      if (Number(s.quantity) > 0) b.productCount++;
      b.stockQty += Number(s.quantity);
      b.value += Number(s.quantity) * Number(s.product.costPrice);
    }
  }
  const branchSummary = Array.from(branchMap.values());

  const forecastCount = await prisma.erpInventoryForecast.count();

  return ok({
    totalProducts,
    totalStockQty: Number(totalStockQty),
    totalInventoryValue,
    lowStockCount,
    outOfStockCount,
    recentMovements,
    branchSummary,
    forecastsAvailable: forecastCount > 0,
  });
}

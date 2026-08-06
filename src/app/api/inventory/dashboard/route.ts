import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok } from '@/lib/api';

export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const [totalProducts, stockAgg, outOfStockCount, recentMovements, branches] = await Promise.all([
    prisma.erpProduct.count(),
    prisma.erpProduct.aggregate({ _sum: { stock: true } }),
    prisma.erpProduct.count({ where: { stock: 0, isActive: true } }),
    prisma.erpStockMovement.count({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.erpBranch.findMany({ select: { id: true, name: true } }),
  ]);

  const products = await prisma.erpProduct.findMany({
    where: { isActive: true },
    select: { stock: true, costPrice: true, minStock: true, branchId: true, id: true },
  });

  const lowStockCount = products.filter((p) => Number(p.stock) > 0 && Number(p.stock) <= Number(p.minStock)).length;
  const totalStockQty = stockAgg._sum.stock || 0;
  const totalInventoryValue = products.reduce((sum, p) => sum + Number(p.stock) * Number(p.costPrice), 0);

  const branchMap = new Map<string, { id: string; branch: string; productCount: number; stockQty: number; value: number }>();
  for (const b of branches) {
    branchMap.set(b.id, { id: b.id, branch: b.name, productCount: 0, stockQty: 0, value: 0 });
  }
  for (const p of products) {
    if (p.branchId && branchMap.has(p.branchId)) {
      const b = branchMap.get(p.branchId)!;
      b.productCount++;
      b.stockQty += Number(p.stock);
      b.value += Number(p.stock) * Number(p.costPrice);
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

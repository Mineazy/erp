import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok, getBranchFilter } from '@/lib/api';

export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const branchFilter = getBranchFilter(session) || {};

  const [stockAgg, outOfStockCount, recentMovements, branches] = await Promise.all([
    prisma.erpBranchStock.aggregate({ 
      where: { ...branchFilter },
      _sum: { quantity: true } 
    }),
    prisma.erpBranchStock.count({ 
      where: { quantity: 0, product: { isActive: true }, ...branchFilter } 
    }),
    prisma.erpStockMovement.count({
      where: { 
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        ...branchFilter
      },
    }),
    prisma.erpBranch.findMany({ select: { id: true, name: true } }),
  ]);

  const stocks = await prisma.erpBranchStock.findMany({
    where: { product: { isActive: true }, ...branchFilter },
    select: { 
      quantity: true, 
      minQuantity: true, 
      branchId: true, 
      productId: true, 
      product: { select: { costPrice: true, categoryId: true, category: { select: { name: true } } } } 
    },
  });

  const totalProducts = new Set(stocks.map(s => s.productId)).size;
  const lowStockCount = stocks.filter((s) => Number(s.quantity) > 0 && Number(s.quantity) <= Number(s.minQuantity)).length;
  const totalStockQty = stockAgg._sum.quantity || 0;
  const totalInventoryValue = stocks.reduce((sum, s) => sum + Number(s.quantity) * Number(s.product.costPrice), 0);

  const branchMap = new Map<string, { id: string; branch: string; productCount: number; stockQty: number; value: number }>();
  for (const b of branches) {
    if (branchFilter.branchId && b.id !== branchFilter.branchId) continue;
    branchMap.set(b.id, { id: b.id, branch: b.name, productCount: 0, stockQty: 0, value: 0 });
  }

  const categoryMap = new Map<string, { id: string; name: string; productCount: number }>();

  // A given branch/HQ could have multiple ErpBranchStock records for the SAME product (if it's an error), 
  // but usually it's 1-to-1 per branch. We want to count distinct products per category.
  const seenProductByCategory = new Set<string>();

  for (const s of stocks) {
    if (s.branchId && branchMap.has(s.branchId)) {
      const b = branchMap.get(s.branchId)!;
      if (Number(s.quantity) > 0) b.productCount++;
      b.stockQty += Number(s.quantity);
      b.value += Number(s.quantity) * Number(s.product.costPrice);
    }

    if (s.product.categoryId) {
      const uniqueKey = `${s.product.categoryId}_${s.productId}`;
      if (!seenProductByCategory.has(uniqueKey)) {
        seenProductByCategory.add(uniqueKey);
        const catId = s.product.categoryId;
        const catName = s.product.category?.name || 'Uncategorized';
        if (!categoryMap.has(catId)) {
          categoryMap.set(catId, { id: catId, name: catName, productCount: 0 });
        }
        categoryMap.get(catId)!.productCount++;
      }
    }
  }
  const branchSummary = Array.from(branchMap.values());
  const categorySummary = Array.from(categoryMap.values()).sort((a, b) => b.productCount - a.productCount);

  const forecastCount = await prisma.erpInventoryForecast.count();

  return ok({
    totalProducts,
    totalStockQty: Number(totalStockQty),
    totalInventoryValue,
    lowStockCount,
    outOfStockCount,
    recentMovements,
    branchSummary,
    categorySummary,
    forecastsAvailable: forecastCount > 0,
  });
}

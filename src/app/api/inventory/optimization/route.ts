import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, created, ok, getBody, parseListParams, getBranchFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const sp = parseListParams(request.nextUrl.searchParams);
  const type = request.nextUrl.searchParams.get('type');
  const priority = request.nextUrl.searchParams.get('priority');
  const sort = sp.sort || 'createdAt';
  const order = sp.order || 'desc';
  const page = sp.page || 1;
  const limit = sp.limit || 50;
  const branchFilter = getBranchFilter(session);
  const where: Record<string, unknown> = {};
  Object.assign(where, branchFilter);
  if (type) where.recommendationType = type;
  if (priority) where.priority = priority;

  const orderBy: Record<string, 'asc' | 'desc'> = {};
  orderBy[sort] = order;

  const [items, total] = await Promise.all([
    prisma.erpInventoryOptimization.findMany({
      where,
      orderBy: orderBy as any,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.erpInventoryOptimization.count({ where }),
  ]);

  return ok({ items, total, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const branchFilter = getBranchFilter(session);
  const stockWhere: Record<string, unknown> = { product: { isActive: true } };
  if (branchFilter?.branchId) stockWhere.branchId = branchFilter.branchId;

  const branchStocks = await prisma.erpBranchStock.findMany({ 
    where: stockWhere,
    include: { product: true }
  });
  const recommendations: Array<Record<string, unknown>> = [];

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  for (const branchStock of branchStocks) {
    const product = branchStock.product;
    const stock = Number(branchStock.quantity);
    const maxStock = Number(branchStock.maxQuantity || 0);

    if (maxStock > 0 && stock > maxStock * 1.5) {
      const excessQty = stock - maxStock;
      recommendations.push({
        productId: product.id,
        productName: product.name,
        branchId: branchStock.branchId,
        recommendationType: 'excess_stock',
        currentStock: stock,
        suggestedAction: 'Reduce stock',
        suggestedQty: excessQty,
        reason: `Stock ${stock} exceeds 150% of max stock ${maxStock}`,
        priority: stock > maxStock * 2 ? 'high' : 'medium',
      });
    }

    const recentMovements = await prisma.erpStockMovement.count({
      where: { productId: product.id, branchId: branchStock.branchId, createdAt: { gte: ninetyDaysAgo } },
    });

    if (recentMovements === 0 && stock > 0) {
      recommendations.push({
        productId: product.id,
        productName: product.name,
        branchId: branchStock.branchId,
        recommendationType: 'dead_stock',
        currentStock: stock,
        suggestedAction: 'Dispose or donate',
        suggestedQty: stock,
        reason: 'No stock movements in the last 90 days',
        priority: 'high',
      });
    } else if (stock > 0) {
      const salesQty = await prisma.erpSalesOrderLine.aggregate({
        where: { productId: product.id, order: { branchId: branchStock.branchId, createdAt: { gte: ninetyDaysAgo } } },
        _sum: { quantity: true },
      });
      const totalSold = Number(salesQty._sum.quantity || 0);
      if (stock > 0 && totalSold > 0 && stock / totalSold > 6) {
        recommendations.push({
          productId: product.id,
          productName: product.name,
          branchId: branchStock.branchId,
          recommendationType: 'slow_moving',
          currentStock: stock,
          suggestedAction: 'Reduce reorder or promote',
          suggestedQty: Math.round(stock / 2),
          reason: `Stock covers ${(stock / totalSold).toFixed(1)} months of sales`,
          priority: 'medium',
        });
      }
    }
  }

  for (const rec of recommendations) {
    await prisma.erpInventoryOptimization.create({ data: rec as any });
  }

  return created({ created: recommendations.length, recommendations });
}

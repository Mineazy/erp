import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const reportType = searchParams.get('reportType') || 'stock-on-hand';
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const branchId = searchParams.get('branchId');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');

  const dateFilter: Record<string, unknown> = {};
  if (startDate || endDate) {
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
  }

  const branchFilter: Record<string, unknown> = {};
  if (branchId) branchFilter.branchId = branchId;

  switch (reportType) {
    case 'stock-on-hand': {
      const items = await prisma.erpProduct.findMany({
        where: { isActive: true, ...branchFilter },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      const total = await prisma.erpProduct.count({ where: { isActive: true, ...branchFilter } });
      return ok({ items, total, page, limit, reportType });
    }

    case 'valuation': {
      const products = await prisma.erpProduct.findMany({
        where: { isActive: true, ...branchFilter },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      const total = await prisma.erpProduct.count({ where: { isActive: true, ...branchFilter } });
      const items = products.map((p) => ({
        ...p,
        valuation: Number(p.stock) * Number(p.costPrice),
      }));
      const grandTotal = items.reduce((sum, i) => sum + i.valuation, 0);
      return ok({ items, total, grandTotal, page, limit, reportType });
    }

    case 'movements': {
      const where: Record<string, unknown> = {};
      Object.assign(where, branchFilter);
      if (Object.keys(dateFilter).length) where.createdAt = dateFilter;

      const [items, total] = await Promise.all([
        prisma.erpStockMovement.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.erpStockMovement.count({ where }),
      ]);
      return ok({ items, total, page, limit, reportType });
    }

    case 'fast-moving': {
      const products = await prisma.erpProduct.findMany({
        where: { isActive: true, ...branchFilter },
        select: { id: true, name: true, code: true, stock: true, costPrice: true, sellingPrice: true },
      });

      const itemsWithSales = await Promise.all(
        products.map(async (p) => {
          const salesAgg = await prisma.erpSalesOrderLine.aggregate({
            where: {
              productId: p.id,
              ...(Object.keys(dateFilter).length ? { order: { createdAt: dateFilter } } : {}),
            },
            _sum: { quantity: true },
          });
          return { ...p, salesVolume: Number(salesAgg._sum.quantity || 0) };
        })
      );

      itemsWithSales.sort((a, b) => b.salesVolume - a.salesVolume);
      const offset = (page - 1) * limit;
      const items = itemsWithSales.slice(offset, offset + limit);
      return ok({ items, total: itemsWithSales.length, page, limit, reportType });
    }

    case 'slow-moving': {
      const products = await prisma.erpProduct.findMany({
        where: { isActive: true, ...branchFilter },
        select: { id: true, name: true, code: true, stock: true, costPrice: true, sellingPrice: true },
      });

      const itemsWithSales = await Promise.all(
        products.map(async (p) => {
          const salesAgg = await prisma.erpSalesOrderLine.aggregate({
            where: {
              productId: p.id,
              ...(Object.keys(dateFilter).length ? { order: { createdAt: dateFilter } } : {}),
            },
            _sum: { quantity: true },
          });
          return { ...p, salesVolume: Number(salesAgg._sum.quantity || 0) };
        })
      );

      itemsWithSales.sort((a, b) => a.salesVolume - b.salesVolume);
      const offset = (page - 1) * limit;
      const items = itemsWithSales.slice(offset, offset + limit);
      return ok({ items, total: itemsWithSales.length, page, limit, reportType });
    }

    case 'dead-stock': {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const allProducts = await prisma.erpProduct.findMany({
        where: { isActive: true, stock: { gt: 0 }, ...branchFilter },
        select: { id: true, name: true, code: true, stock: true, costPrice: true },
      });

      const deadStockItems = [];
      for (const p of allProducts) {
        const movementCount = await prisma.erpStockMovement.count({
          where: { productId: p.id, createdAt: { gte: ninetyDaysAgo } },
        });
        if (movementCount === 0) {
          deadStockItems.push({ ...p, daysWithoutMovement: 90 });
        }
      }

      const offset = (page - 1) * limit;
      const items = deadStockItems.slice(offset, offset + limit);
      return ok({ items, total: deadStockItems.length, page, limit, reportType });
    }

    case 'turnover': {
      const products = await prisma.erpProduct.findMany({
        where: { isActive: true, ...branchFilter },
        select: { id: true, name: true, code: true, stock: true, costPrice: true },
      });

      const turnoverItems = await Promise.all(
        products.map(async (p) => {
          const outMovements = await prisma.erpStockMovement.aggregate({
            where: { productId: p.id, type: 'out' },
            _sum: { quantity: true },
          });
          const totalOut = Number(outMovements._sum.quantity || 0);
          const avgStock = Number(p.stock) || 1;
          const turnoverRatio = totalOut / avgStock;
          return { ...p, totalOut, avgStock, turnoverRatio: Math.round(turnoverRatio * 100) / 100 };
        })
      );

      turnoverItems.sort((a, b) => b.turnoverRatio - a.turnoverRatio);
      const offset = (page - 1) * limit;
      const items = turnoverItems.slice(offset, offset + limit);
      return ok({ items, total: turnoverItems.length, page, limit, reportType });
    }

    case 'aging': {
      const batches = await prisma.erpProductBatch.findMany({
        where: {
          quantity: { gt: 0 },
          expiryDate: { not: null },
          ...branchFilter,
        },
        include: { product: { select: { name: true, code: true } } },
        orderBy: { expiryDate: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      const total = await prisma.erpProductBatch.count({
        where: { quantity: { gt: 0 }, expiryDate: { not: null }, ...branchFilter },
      });

      const now = new Date();
      const items = batches.map((b) => {
        const daysUntilExpiry = b.expiryDate ? Math.ceil((b.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
        let agingCategory = 'unknown';
        if (daysUntilExpiry !== null) {
          if (daysUntilExpiry <= 0) agingCategory = 'expired';
          else if (daysUntilExpiry <= 30) agingCategory = 'critical';
          else if (daysUntilExpiry <= 90) agingCategory = 'soon';
          else agingCategory = 'good';
        }
        return { ...b, daysUntilExpiry, agingCategory };
      });

      return ok({ items, total, page, limit, reportType });
    }

    case 'restock-prediction': {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const products = await prisma.erpProduct.findMany({
        where: { isActive: true, ...branchFilter },
        select: { id: true, name: true, code: true, stock: true, minStock: true, costPrice: true },
        orderBy: { name: 'asc' },
      });

      const items = await Promise.all(
        products.map(async (p) => {
          const salesAgg = await prisma.erpSalesOrderLine.aggregate({
            where: {
              productId: p.id,
              order: { createdAt: { gte: thirtyDaysAgo } },
            },
            _sum: { quantity: true },
          });

          const totalSales = Number(salesAgg._sum.quantity || 0);
          const dailyVelocity = totalSales / 30;
          const currentStock = Number(p.stock);
          const minStock = Number(p.minStock);

          const daysRemaining = dailyVelocity > 0 ? (currentStock / dailyVelocity) : null;
          const predictedRestockDate = daysRemaining !== null
            ? new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            : 'N/A';

          const recommendedRestockQty = dailyVelocity > 0
            ? Math.max(0, Math.ceil(dailyVelocity * 30 - currentStock))
            : (currentStock < minStock ? (minStock * 2 - currentStock) : 0);

          let status = 'Good';
          if (currentStock === 0) status = 'Out of Stock';
          else if (currentStock <= minStock) status = 'Low Stock';
          else if (daysRemaining !== null && daysRemaining <= 7) status = 'Urgent Restock';
          else if (daysRemaining !== null && daysRemaining <= 15) status = 'Reorder Soon';

          return {
            id: p.id,
            product: p.name,
            code: p.code,
            current_stock: currentStock,
            daily_velocity: Math.round(dailyVelocity * 100) / 100,
            days_remaining: daysRemaining !== null ? Math.round(daysRemaining) : '∞',
            recommended_restock_qty: recommendedRestockQty,
            predicted_restock_date: predictedRestockDate,
            status,
          };
        })
      );

      return ok({ items, total: items.length, page, limit, reportType });
    }

    default:
      return ok({ error: `Unknown report type: ${reportType}` });
  }
}

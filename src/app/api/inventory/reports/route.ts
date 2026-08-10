import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok, getBranchFilter } from '@/lib/api';

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
  const userBranchFilter = getBranchFilter(session);
  
  if (userBranchFilter?.branchId) {
    branchFilter.branchId = userBranchFilter.branchId;
  } else if (branchId) {
    branchFilter.branchId = branchId;
  }

  switch (reportType) {
    case 'stock-on-hand':
    case 'valuation': {
      const branchStocks = await prisma.erpBranchStock.findMany({
        where: { product: { isActive: true }, ...branchFilter },
        include: { product: true, branch: true },
        orderBy: { product: { name: 'asc' } },
        skip: (page - 1) * limit,
        take: limit,
      });
      const total = await prisma.erpBranchStock.count({ where: { product: { isActive: true }, ...branchFilter } });

      if (reportType === 'stock-on-hand') {
        const items = branchStocks.map(bs => ({
          ...bs.product,
          stock: Number(bs.quantity),
          branchName: bs.branch.name
        }));
        return ok({ items, total, page, limit, reportType });
      } else {
        const items = branchStocks.map(bs => {
          const qty = Number(bs.quantity);
          const cost = Number(bs.product.costPrice);
          return {
            ...bs.product,
            stock: qty,
            branchName: bs.branch.name,
            valuation: qty * cost,
          };
        });
        const grandTotal = items.reduce((sum, i) => sum + i.valuation, 0);
        return ok({ items, total, grandTotal, page, limit, reportType });
      }
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

    case 'fast-moving':
    case 'slow-moving': {
      const branchStocks = await prisma.erpBranchStock.findMany({
        where: { product: { isActive: true }, ...branchFilter },
        include: { product: { select: { id: true, name: true, code: true, costPrice: true, sellingPrice: true } } },
      });

      const itemsWithSales = await Promise.all(
        branchStocks.map(async (bs) => {
          const salesAgg = await prisma.erpSalesOrderLine.aggregate({
            where: {
              productId: bs.productId,
              order: { branchId: bs.branchId, ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}) },
            },
            _sum: { quantity: true },
          });
          return {
            id: bs.productId,
            name: bs.product.name,
            code: bs.product.code,
            stock: Number(bs.quantity),
            costPrice: Number(bs.product.costPrice),
            sellingPrice: Number(bs.product.sellingPrice),
            salesVolume: Number(salesAgg._sum.quantity || 0)
          };
        })
      );

      if (reportType === 'fast-moving') {
        itemsWithSales.sort((a, b) => b.salesVolume - a.salesVolume);
      } else {
        itemsWithSales.sort((a, b) => a.salesVolume - b.salesVolume);
      }
      const offset = (page - 1) * limit;
      const items = itemsWithSales.slice(offset, offset + limit);
      return ok({ items, total: itemsWithSales.length, page, limit, reportType });
    }

    case 'dead-stock': {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const branchStocks = await prisma.erpBranchStock.findMany({
        where: { product: { isActive: true }, quantity: { gt: 0 }, ...branchFilter },
        include: { product: { select: { id: true, name: true, code: true, costPrice: true } } },
      });

      const deadStockItems = [];
      for (const bs of branchStocks) {
        const movementCount = await prisma.erpStockMovement.count({
          where: { productId: bs.productId, branchId: bs.branchId, createdAt: { gte: ninetyDaysAgo } },
        });
        if (movementCount === 0) {
          deadStockItems.push({
            id: bs.productId,
            name: bs.product.name,
            code: bs.product.code,
            stock: Number(bs.quantity),
            costPrice: Number(bs.product.costPrice),
            daysWithoutMovement: 90
          });
        }
      }

      const offset = (page - 1) * limit;
      const items = deadStockItems.slice(offset, offset + limit);
      return ok({ items, total: deadStockItems.length, page, limit, reportType });
    }

    case 'turnover': {
      const branchStocks = await prisma.erpBranchStock.findMany({
        where: { product: { isActive: true }, ...branchFilter },
        include: { product: { select: { id: true, name: true, code: true, costPrice: true } } },
      });

      const turnoverItems = await Promise.all(
        branchStocks.map(async (bs) => {
          const outMovements = await prisma.erpStockMovement.aggregate({
            where: { productId: bs.productId, branchId: bs.branchId, type: 'out' },
            _sum: { quantity: true },
          });
          const totalOut = Number(outMovements._sum.quantity || 0);
          const avgStock = Number(bs.quantity) || 1;
          const turnoverRatio = totalOut / avgStock;
          return {
            id: bs.productId,
            name: bs.product.name,
            code: bs.product.code,
            stock: Number(bs.quantity),
            costPrice: Number(bs.product.costPrice),
            totalOut,
            avgStock,
            turnoverRatio: Math.round(turnoverRatio * 100) / 100
          };
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
      const branchStocks = await prisma.erpBranchStock.findMany({
        where: { product: { isActive: true }, ...branchFilter },
        include: { product: { select: { id: true, name: true, code: true, costPrice: true } } },
        orderBy: { product: { name: 'asc' } },
      });

      const items = await Promise.all(
        branchStocks.map(async (bs) => {
          const salesAgg = await prisma.erpSalesOrderLine.aggregate({
            where: {
              productId: bs.productId,
              order: { branchId: bs.branchId, createdAt: { gte: thirtyDaysAgo } },
            },
            _sum: { quantity: true },
          });

          const totalSales = Number(salesAgg._sum.quantity || 0);
          const dailyVelocity = totalSales / 30;
          const currentStock = Number(bs.quantity);
          const minStock = Number(bs.minQuantity);

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
            id: bs.productId,
            product: bs.product.name,
            code: bs.product.code,
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

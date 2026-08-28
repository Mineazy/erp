import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, created, ok, getBody, getNextSequence, parseListParams, getBranchFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const sp = parseListParams(request.nextUrl.searchParams);
    const search = sp.search;
    const sort = sp.sort || 'createdAt';
    const order = sp.order || 'desc';
    const page = sp.page || 1;
    const limit = sp.limit || 50;
    const categoryId = request.nextUrl.searchParams.get('categoryId');
    const warehouseId = request.nextUrl.searchParams.get('warehouseId');
    const where: Record<string, unknown> = {};

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { description: { contains: search } },
        { barcode: { contains: search } },
        { category: { name: { contains: search } } }
      ];
    }

    const orderBy: any = {};
    if (sort === 'category') {
      orderBy.category = { name: order };
    } else {
      orderBy[sort] = order;
    }

    const [items, total] = await Promise.all([
      prisma.erpProduct.findMany({
        where,
        include: { category: true },
        orderBy: orderBy as any,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.erpProduct.count({ where }),
    ]);

    const branchFilter = getBranchFilter(session) || {};
    if (items.length > 0) {
      const pIds = items.map(i => i.id);

      if (warehouseId) {
        const warehouseStocks = await prisma.erpWarehouseStock.findMany({
          where: { productId: { in: pIds } },
          include: { warehouse: { select: { id: true, name: true } } }
        });
        
        const stockMap = new Map<string, number>();
        const otherWarehousesMap = new Map<string, Set<string>>();
        for (const ws of warehouseStocks) {
          const qty = Number(ws.quantity);
          if (qty <= 0) continue;
          if (ws.warehouseId === warehouseId) {
            stockMap.set(ws.productId, (stockMap.get(ws.productId) || 0) + qty);
          } else if (ws.warehouse?.name) {
            const locs = otherWarehousesMap.get(ws.productId) || new Set();
            locs.add(ws.warehouse.name);
            otherWarehousesMap.set(ws.productId, locs);
          }
        }
        
        for (const item of items) {
          (item as any).stock = stockMap.get(item.id) || 0;
          (item as any).availableLocations = Array.from(otherWarehousesMap.get(item.id) || []);
        }
      } else {
        const allStocks = await prisma.erpBranchStock.findMany({
          where: { productId: { in: pIds } },
          include: { branch: { select: { name: true } } }
        });
        
        const stockMap = new Map();
        const locationsMap = new Map();

        for (const bs of allStocks) {
          if (!branchFilter.branchId || branchFilter.branchId === bs.branchId) {
            stockMap.set(bs.productId, (stockMap.get(bs.productId) || 0) + Number(bs.quantity));
          }
          if (Number(bs.quantity) > 0 && bs.branch) {
            const locs = locationsMap.get(bs.productId) || new Set();
            locs.add(bs.branch.name);
            locationsMap.set(bs.productId, locs);
          }
        }
        
        for (const item of items) {
          (item as any).stock = stockMap.get(item.id) || 0;
          (item as any).availableLocations = Array.from(locationsMap.get(item.id) || []);
        }
      }
    }

    return ok({ items, total, page, limit });
  } catch (error: any) {
    console.error('API ERROR in /api/inventory/products:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Error', stack: error.stack }), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const body = await getBody(request);
    const { name, description, categoryId, unit, costPrice, sellingPrice, location, barcode } = body;
    if (!name) return badRequest('Product name is required');

    const code = await getNextSequence(prisma, 'erpProduct', 'code', 'PRD');

    const branchFilter = getBranchFilter(session);
    const branchStockData = branchFilter?.branchId ? {
      create: { branchId: branchFilter.branchId, quantity: 0, minQuantity: 0 }
    } : undefined;

    const product = await prisma.erpProduct.create({
      data: {
        code,
        name: name as string,
        description: description as string | undefined,
        categoryId: categoryId as string | undefined,
        unit: (unit as string) || 'each',
        costPrice: parseFloat(costPrice as string) || 0,
        sellingPrice: parseFloat(sellingPrice as string) || 0,
        location: location as string | undefined,
        barcode: barcode as string | undefined,
        ...(branchStockData && { branchStocks: branchStockData })
      },
    });

    return created(product);
  } catch (error: any) {
    console.error('API ERROR in POST /api/inventory/products:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Error', stack: error.stack }), { status: 500 });
  }
}

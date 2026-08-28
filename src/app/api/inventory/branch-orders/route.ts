import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, created, ok, getBody, getNextSequence, parseListParams, getBranchFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const sp = parseListParams(request.nextUrl.searchParams);
  const search = sp.search;
  const status = sp.status;
  const sort = sp.sort || 'createdAt';
  const order = sp.order || 'desc';
  const page = sp.page || 1;
  const limit = sp.limit || 50;
  
  // A branch order is a transfer from a Warehouse to a Branch
  const where: Record<string, unknown> = {
    toBranchId: { not: null },
    fromWarehouseId: { not: null }
  };
  
  // Warehouse/Inventory department users see ALL branch orders (they process them)
  const userDept = ((session.user as any)?.department || '').toLowerCase();
  const isWarehouseDept = userDept === 'warehouse' || userDept === 'inventory';
  const isAdmin = (session.user as any)?.role === 'admin';

  if (isWarehouseDept || isAdmin) {
    // Warehouse dept sees all orders EXCEPT drafts (drafts are private to the creating branch)
    if (!status || status !== 'draft') {
      where.status = { not: 'draft' };
    }
  } else {
    const branchFilter = getBranchFilter(session);
    if (branchFilter && branchFilter.branchId) {
      where.toBranchId = branchFilter.branchId;
    }
  }

  if (search) {
    where.OR = [
      { transferNo: { contains: search } },
      { notes: { contains: search } },
    ];
  }
  if (status) where.status = status;

  const orderBy: Record<string, 'asc' | 'desc'> = {};
  orderBy[sort] = order;

  const [items, total] = await Promise.all([
    prisma.erpStockTransfer.findMany({
      where,
      orderBy: orderBy as any,
      skip: (page - 1) * limit,
      take: limit,
      include: { lines: true, toBranch: true, fromWarehouse: true },
    }),
    prisma.erpStockTransfer.count({ where }),
  ]);

  const productIds = new Set<string>();
  for (const item of items) {
    for (const line of item.lines) {
      if (!line.productCode && line.productId) {
        productIds.add(line.productId);
      }
    }
  }

  let productMap = new Map<string, string>();
  if (productIds.size > 0) {
    const products = await prisma.erpProduct.findMany({
      where: { id: { in: Array.from(productIds) } },
      select: { id: true, code: true },
    });
    for (const p of products) {
      productMap.set(p.id, p.code);
    }
  }

  for (const item of items) {
    for (const line of item.lines) {
      if (!line.productCode && productMap.has(line.productId)) {
        (line as any).productCode = productMap.get(line.productId);
      }
    }
  }

  return ok({ items, total, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { fromWarehouseId, toBranchId, notes, status } = body;
  const lines = (body.lines || []) as any[];
  
  if (!fromWarehouseId || !toBranchId) return badRequest('fromWarehouseId and toBranchId are required');
  if (!lines.length) return badRequest('At least one line item is required');

  const orderStatus = (status === 'draft') ? 'draft' : 'pending';
  const transferNo = await getNextSequence(prisma, 'erpStockTransfer', 'transferNo', 'TRF');

  const transfer = await prisma.erpStockTransfer.create({
    data: {
      transferNo,
      fromWarehouseId: fromWarehouseId as string,
      toBranchId: toBranchId as string,
      status: orderStatus,
      requestedBy: (session.user as any).email || 'unknown',
      notes: notes as string | undefined,
      lines: {
        create: lines.map((l: any) => ({
          productId: l.productId,
          productName: l.productName,
          productCode: l.productCode || null,
          quantity: parseFloat(l.quantity),
          batchNo: l.batchNo || null,
          unitPrice: parseFloat(l.unitPrice) || 0,
        })),
      },
    },
    include: { lines: true },
  });

  return created(transfer);
}

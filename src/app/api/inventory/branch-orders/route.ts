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
  
  // If the user belongs to a specific branch, only show their orders
  const branchFilter = getBranchFilter(session);
  if (branchFilter && branchFilter.branchId) {
    where.toBranchId = branchFilter.branchId;
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

  return ok({ items, total, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { fromWarehouseId, toBranchId, notes } = body;
  const lines = (body.lines || []) as any[];
  
  if (!fromWarehouseId || !toBranchId) return badRequest('fromWarehouseId and toBranchId are required');
  if (!lines.length) return badRequest('At least one line item is required');

  const transferNo = await getNextSequence(prisma, 'erpStockTransfer', 'transferNo', 'TRF');

  const transfer = await prisma.erpStockTransfer.create({
    data: {
      transferNo,
      fromWarehouseId: fromWarehouseId as string,
      toBranchId: toBranchId as string,
      status: 'pending',
      requestedBy: (session.user as any).email || 'unknown',
      notes: notes as string | undefined,
      lines: {
        create: lines.map((l: any) => ({
          productId: l.productId,
          productName: l.productName,
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

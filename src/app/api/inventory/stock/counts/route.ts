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
  const branchFilter = getBranchFilter(session);
  const where: Record<string, unknown> = {};
  Object.assign(where, branchFilter);
  if (search) {
    where.OR = [
      { countNo: { contains: search } },
      { countedBy: { contains: search } },
    ];
  }
  if (status) where.status = status;

  const orderBy: Record<string, 'asc' | 'desc'> = {};
  orderBy[sort] = order;

  const [items, total] = await Promise.all([
    prisma.erpInventoryCount.findMany({
      where,
      orderBy: orderBy as any,
      skip: (page - 1) * limit,
      take: limit,
      include: { lines: true },
    }),
    prisma.erpInventoryCount.count({ where }),
  ]);

  return ok({ items, total, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { notes } = body;
  const productIds = (body.productIds || []) as string[];
  if (!productIds.length) return badRequest('At least one productId is required');

  const branchId = (session.user as any)?.branchId || null;

  const products = await prisma.erpProduct.findMany({
    where: { id: { in: productIds } },
  });
  if (!products.length) return badRequest('No valid products found');

  const branchStocks = branchId ? await prisma.erpBranchStock.findMany({
    where: { branchId, productId: { in: productIds } }
  }) : [];
  const stockMap = new Map(branchStocks.map(bs => [bs.productId, bs.quantity]));

  const countNo = await getNextSequence(prisma, 'erpInventoryCount', 'countNo', 'ICT');
  const userEmail = (session.user as any).email || 'unknown';

  const count = await prisma.erpInventoryCount.create({
    data: {
      countNo,
      status: 'draft',
      countedBy: userEmail,
      notes: notes as string | undefined,
      branchId,
      lines: {
        create: products.map((p) => ({
          productId: p.id,
          productName: p.name,
          systemQty: Number(stockMap.get(p.id) || 0),
          countedQty: 0,
          variance: 0,
        })),
      },
    },
    include: { lines: true },
  });

  return created(count);
}

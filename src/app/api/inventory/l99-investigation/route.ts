import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok, parseListParams } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const sp = parseListParams(request.nextUrl.searchParams);
  const search = sp.search;
  const page = sp.page || 1;
  const limit = sp.limit || 50;

  const l99 = await prisma.erpWarehouse.findUnique({ where: { code: 'L99' } });
  if (!l99) return ok({ items: [], total: 0, page, limit });

  const where: any = {
    warehouseId: l99.id,
    quantity: { gt: 0 },
  };

  if (search) {
    where.OR = [
      { product: { name: { contains: search } } },
      { product: { code: { contains: search } } },
      { batchNo: { contains: search } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.erpWarehouseStock.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        product: true,
      },
      orderBy: { quantity: 'desc' },
    }),
    prisma.erpWarehouseStock.count({ where }),
  ]);

  return ok({ items, total, page, limit });
}

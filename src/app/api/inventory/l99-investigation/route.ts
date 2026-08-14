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

  const where: any = {
    status: 'in_transit',
  };

  if (search) {
    where.OR = [
      { transferNo: { contains: search } },
      { fromWarehouse: { name: { contains: search } } },
      { toBranch: { name: { contains: search } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.erpStockTransfer.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        fromWarehouse: true,
        toBranch: true,
        lines: true
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.erpStockTransfer.count({ where }),
  ]);

  return ok({ items, total, page, limit });
}

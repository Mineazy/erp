import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const sp = request.nextUrl.searchParams;
  const productId = sp.get('productId');
  const page = parseInt(sp.get('page') || '1');
  const limit = parseInt(sp.get('limit') || '50');

  const where: any = {};
  if (productId) where.productId = productId;

  const [items, total] = await Promise.all([
    prisma.erpPriceAdjustment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.erpPriceAdjustment.count({ where }),
  ]);

  return ok({ items, total, page, limit });
}

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, created, ok, getBody, getNextSequence, parseListParams } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const sp = parseListParams(request.nextUrl.searchParams);
  const search = sp.search;
  const sort = sp.sort || 'createdAt';
  const order = sp.order || 'desc';
  const page = sp.page || 1;
  const limit = sp.limit || 50;
  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } },
      { description: { contains: search } },
    ];
  }

  const orderBy: Record<string, 'asc' | 'desc'> = {};
  orderBy[sort] = order;

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

  return ok({ items, total, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { name, description, categoryId, unit, costPrice, sellingPrice, stock, minStock, location, barcode } = body;
  if (!name) return badRequest('Product name is required');

  const code = await getNextSequence(prisma, 'erpProduct', 'code', 'PRD');

  const product = await prisma.erpProduct.create({
    data: {
      code,
      name: name as string,
      description: description as string | undefined,
      categoryId: categoryId as string | undefined,
      unit: (unit as string) || 'each',
      costPrice: parseFloat(costPrice as string) || 0,
      sellingPrice: parseFloat(sellingPrice as string) || 0,
      stock: parseFloat(stock as string) || 0,
      minStock: parseFloat(minStock as string) || 0,
      location: location as string | undefined,
      barcode: barcode as string | undefined,
    },
  });

  return created(product);
}

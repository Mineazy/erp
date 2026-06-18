import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, created, ok, getBody, getNextSequence } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category');

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } },
    ];
  }
  if (category) where.category = category;

  const items = await prisma.taxType.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return ok(items);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { name, category, rate, isActive, rules } = body;
  if (!name) return badRequest('Name is required');
  if (!category) return badRequest('Category is required');
  if (rate === undefined || rate === null) return badRequest('Rate is required');

  const code = await getNextSequence(prisma, 'taxType', 'code', 'TAX');

  const item = await prisma.taxType.create({
    data: {
      code,
      name: name as string,
      category: category as string,
      rate: parseFloat(rate as string),
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      rules: (rules as object) || undefined,
    },
  });
  return created(item);
}

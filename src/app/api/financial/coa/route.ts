import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, badRequest, ok, created, getBody, getNextSequence } from '@/lib/api';

const TYPE_PREFIX: Record<string, string> = {
  ASSET: '1', LIABILITY: '2', EQUITY: '3', INCOME: '4', EXPENSE: '5',
};

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const type = searchParams.get('type');

  const where: any = {};
  if (search) where.OR = [{ name: { contains: search } }, { code: { contains: search } }];
  if (type) where.type = type;

  const accounts = await prisma.erpChartOfAccounts.findMany({
    where,
    include: { children: { include: { children: { include: { children: true } } } } },
    orderBy: { code: 'asc' },
  });
  return ok(accounts);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { name, type, category, isHeader, parentId, currency } = body;

  if (!name || !type) return badRequest('Name and type are required');

  const prefix = TYPE_PREFIX[type as string];
  if (!prefix) return badRequest(`Invalid type. Must be one of: ${Object.keys(TYPE_PREFIX).join(', ')}`);

  const code = await getNextSequence(prisma, 'erpChartOfAccounts', 'code', prefix);

  const account = await prisma.erpChartOfAccounts.create({
    data: {
      code,
      name: name as string,
      type: type as string,
      category: category as string,
      isHeader: Boolean(isHeader),
      parentId: parentId as string,
      currency: (currency as string) || 'USD',
    },
  });
  return created(account);
}

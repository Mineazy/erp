import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, created, getBody, getNextSequence } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const where: any = {};
  if (type) where.type = type;
  if (from || to) {
    where.entryDate = {};
    if (from) where.entryDate.gte = new Date(from);
    if (to) where.entryDate.lte = new Date(to);
  }

  const items = await prisma.erpCashbook.findMany({
    where,
    orderBy: { entryDate: 'desc' },
  });
  return ok(items);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { entryDate, type, accountId, description, amount, currency, reference } = body;

  if (!type || !accountId || !description || amount === undefined || amount === null) return badRequest('Type, account, description, and amount are required');

  const entryNumber = await getNextSequence(prisma, 'erpCashbook', 'entryNumber', 'CB');

  const item = await prisma.erpCashbook.create({
    data: {
      entryNumber,
      entryDate: new Date(entryDate as string),
      type: type as string,
      accountId: accountId as string,
      description: description as string,
      amount: parseFloat(amount as string),
      currency: (currency as string) || 'USD',
      reference: reference as string,
    },
  });
  return created(item);
}

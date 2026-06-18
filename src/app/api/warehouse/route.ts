import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, created, getBody, getNextSequence } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const type = searchParams.get('type');

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } },
      { location: { contains: search } },
    ];
  }
  if (type) where.type = type;

  const items = await prisma.erpWarehouse.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return ok(items);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { name, location, type } = body;

  if (!name) return badRequest('Name is required');

  const code = await getNextSequence(prisma, 'erpWarehouse', 'code', 'WH');

  const item = await prisma.erpWarehouse.create({
    data: {
      code,
      name: name as string,
      location: (location as string) || '',
      type: (type as string) || 'general',
    },
  });
  return created(item);
}

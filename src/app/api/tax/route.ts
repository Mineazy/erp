import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, created, getBody, getNextSequence } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } },
      { category: { contains: search } },
    ];
  }

  const items = await prisma.taxType.findMany({ where, orderBy: { createdAt: 'desc' } });
  return ok(items);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { code, name, category, rate, isActive } = body;
  if (!code || !name) return badRequest('Code and name are required');

  const existing = await prisma.taxType.findUnique({ where: { code: code as string } });
  if (existing) return badRequest('Code already exists');

  const item = await prisma.taxType.create({
    data: {
      code: code as string,
      name: name as string,
      category: (category as string) || 'vat',
      rate: parseFloat(rate as string) || 0,
      isActive: isActive !== undefined ? isActive as boolean : true,
    },
  });
  return created(item);
}

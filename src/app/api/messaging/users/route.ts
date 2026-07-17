import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';

  const where: any = { isActive: true };
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
    ];
  }

  const users = await prisma.erpUser.findMany({
    where,
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
    take: 20,
  });

  return ok(users);
}

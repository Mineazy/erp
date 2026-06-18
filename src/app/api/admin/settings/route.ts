import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, created, ok, getBody } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  const where: any = {};
  if (category) where.category = category;

  const items = await prisma.systemSetting.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return ok(items);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { key, value, category, description } = body;
  if (!key) return badRequest('Key is required');
  if (value === undefined) return badRequest('Value is required');

  const item = await prisma.systemSetting.upsert({
    where: { key: key as string },
    update: {
      value: value as object,
      category: (category as string) || 'general',
      description: description as string | undefined,
    },
    create: {
      key: key as string,
      value: value as object,
      category: (category as string) || 'general',
      description: description as string | undefined,
    },
  });
  return created(item);
}

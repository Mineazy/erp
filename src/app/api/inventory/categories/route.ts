import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, created, ok, getBody } from '@/lib/api';

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const items = await prisma.erpProductCategory.findMany({ orderBy: { name: 'asc' } });
  return ok(items);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { name, parentId } = body;
  if (!name) return badRequest('Category name is required');

  const category = await prisma.erpProductCategory.create({
    data: {
      name: name as string,
      parentId: parentId as string | undefined,
    },
  });

  return created(category);
}

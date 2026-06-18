import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody } from '@/lib/api';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpProductCategory.findUnique({ where: { id: id } });
  if (!existing) return notFound('Category not found');

  const body = await getBody(request);
  const { name, parentId } = body;

  const category = await prisma.erpProductCategory.update({
    where: { id: id },
    data: {
      ...(name !== undefined && { name: name as string }),
      ...(parentId !== undefined && { parentId: parentId as string | null }),
    },
  });

  return ok(category);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpProductCategory.findUnique({ where: { id: id } });
  if (!existing) return notFound('Category not found');

  await prisma.erpProductCategory.delete({ where: { id: id } });
  return ok({ success: true });
}

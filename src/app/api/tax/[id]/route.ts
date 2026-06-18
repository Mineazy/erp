import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, notFound, ok, getBody } from '@/lib/api';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const item = await prisma.taxType.findUnique({ where: { id: id } });
  if (!item) return notFound('Tax type not found');
  return ok(item);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.taxType.findUnique({ where: { id: id } });
  if (!existing) return notFound('Tax type not found');

  const body = await getBody(request);
  const { code, name, category, rate, isActive } = body;

  if (code && code !== existing.code) {
    const dup = await prisma.taxType.findUnique({ where: { code: code as string } });
    if (dup) return badRequest('Code already exists');
  }

  const data: Record<string, unknown> = {};
  if (code) data.code = code;
  if (name) data.name = name;
  if (category) data.category = category;
  if (rate !== undefined) data.rate = parseFloat(rate as string);
  if (isActive !== undefined) data.isActive = isActive === true;

  const item = await prisma.taxType.update({
    where: { id: id },
    data: data as any,
  });
  return ok(item);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.taxType.findUnique({ where: { id: id } });
  if (!existing) return notFound('Tax type not found');

  await prisma.taxType.delete({ where: { id: id } });
  return ok({ deleted: true });
}

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody } from '@/lib/api';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  const { name, category, rate, isActive, rules } = body;

  const data: Record<string, unknown> = {};
  if (name) data.name = name as string;
  if (category) data.category = category as string;
  if (rate) data.rate = parseFloat(rate as string);
  if (isActive !== undefined) data.isActive = Boolean(isActive);
  if (rules !== undefined) data.rules = rules;

  const item = await prisma.taxType.update({
    where: { id: id },
    data: data as any,
  });
  return ok(item);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.taxType.findUnique({ where: { id: id } });
  if (!existing) return notFound('Tax type not found');

  await prisma.taxType.delete({ where: { id: id } });
  return ok({ deleted: true });
}

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody } from '@/lib/api';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const item = await prisma.systemSetting.findUnique({ where: { id: id } });
  if (!item) return notFound('Setting not found');
  return ok(item);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.systemSetting.findUnique({ where: { id: id } });
  if (!existing) return notFound('Setting not found');

  const body = await getBody(request);
  const { key, value, category, description } = body;

  const data: Record<string, unknown> = {};
  if (key) data.key = key as string;
  if (value !== undefined) data.value = value;
  if (category) data.category = category as string;
  if (description !== undefined) data.description = description;

  const item = await prisma.systemSetting.update({
    where: { id: id },
    data: data as any,
  });
  return ok(item);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.systemSetting.findUnique({ where: { id: id } });
  if (!existing) return notFound('Setting not found');

  await prisma.systemSetting.delete({ where: { id: id } });
  return ok({ deleted: true });
}

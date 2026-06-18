import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody } from '@/lib/api';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const item = await prisma.erpWarehouse.findUnique({
    where: { id: id },
    include: { zones: true, stocks: true },
  });
  if (!item) return notFound('Warehouse not found');
  return ok(item);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpWarehouse.findUnique({ where: { id: id } });
  if (!existing) return notFound('Warehouse not found');

  const body = await getBody(request);
  const { name, location, type, isActive } = body;

  const item = await prisma.erpWarehouse.update({
    where: { id: id },
    data: {
      ...(name !== undefined && { name: name as string }),
      ...(location !== undefined && { location: location as string }),
      ...(type !== undefined && { type: type as string }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
    },
  });
  return ok(item);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpWarehouse.findUnique({ where: { id: id } });
  if (!existing) return notFound('Warehouse not found');

  await prisma.erpWarehouse.delete({ where: { id: id } });
  return ok({ success: true });
}

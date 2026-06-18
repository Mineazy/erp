import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody } from '@/lib/api';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const item = await prisma.erpWarehouseStock.findUnique({ where: { id: id } });
  if (!item) return notFound('Stock not found');
  return ok(item);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpWarehouseStock.findUnique({ where: { id: id } });
  if (!existing) return notFound('Stock not found');

  const body = await getBody(request);
  const { warehouseId, productId, quantity, location, batchNo, serialNo } = body;

  const item = await prisma.erpWarehouseStock.update({
    where: { id: id },
    data: {
      ...(warehouseId !== undefined && { warehouseId: warehouseId as string }),
      ...(productId !== undefined && { productId: productId as string }),
      ...(quantity !== undefined && { quantity: quantity as string }),
      ...(location !== undefined && { location: location as string }),
      ...(batchNo !== undefined && { batchNo: batchNo as string | null }),
      ...(serialNo !== undefined && { serialNo: serialNo as string | null }),
    },
  });
  return ok(item);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpWarehouseStock.findUnique({ where: { id: id } });
  if (!existing) return notFound('Stock not found');

  await prisma.erpWarehouseStock.delete({ where: { id: id } });
  return ok({ success: true });
}

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody } from '@/lib/api';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const item = await prisma.erpStockMovement.findUnique({ where: { id: id } });
  if (!item) return notFound('Movement not found');
  return ok(item);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpStockMovement.findUnique({ where: { id: id } });
  if (!existing) return notFound('Movement not found');

  const body = await getBody(request);
  const { type, productId, productName, quantity, fromWarehouseId, toWarehouseId, referenceType, referenceId, notes, userId } = body;

  const item = await prisma.erpStockMovement.update({
    where: { id: id },
    data: {
      ...(type !== undefined && { type: type as string }),
      ...(productId !== undefined && { productId: productId as string }),
      ...(productName !== undefined && { productName: productName as string }),
      ...(quantity !== undefined && { quantity: quantity as string }),
      ...(fromWarehouseId !== undefined && { fromWarehouseId: fromWarehouseId as string | null }),
      ...(toWarehouseId !== undefined && { toWarehouseId: toWarehouseId as string | null }),
      ...(referenceType !== undefined && { referenceType: referenceType as string }),
      ...(referenceId !== undefined && { referenceId: referenceId as string }),
      ...(notes !== undefined && { notes: notes as string }),
      ...(userId !== undefined && { userId: userId as string }),
    },
  });
  return ok(item);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpStockMovement.findUnique({ where: { id: id } });
  if (!existing) return notFound('Movement not found');

  await prisma.erpStockMovement.delete({ where: { id: id } });
  return ok({ success: true });
}

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody } from '@/lib/api';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const item = await prisma.erpEquipment.findUnique({ where: { id: id } });
  if (!item) return notFound('Equipment not found');
  return ok(item);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpEquipment.findUnique({ where: { id: id } });
  if (!existing) return notFound('Equipment not found');

  const body = await getBody(request);
  const { name, type, model, manufacturer, serialNo, location, purchaseDate, purchaseCost, status, isActive } = body;

  const item = await prisma.erpEquipment.update({
    where: { id: id },
    data: {
      ...(name !== undefined && { name: name as string }),
      ...(type !== undefined && { type: type as string }),
      ...(model !== undefined && { model: model as string | null }),
      ...(manufacturer !== undefined && { manufacturer: manufacturer as string | null }),
      ...(serialNo !== undefined && { serialNo: serialNo as string | null }),
      ...(location !== undefined && { location: location as string | null }),
      ...(purchaseDate !== undefined && { purchaseDate: purchaseDate ? new Date(purchaseDate as string) : null }),
      ...(purchaseCost !== undefined && { purchaseCost: parseFloat(purchaseCost as string) }),
      ...(status !== undefined && { status: status as string }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
    },
  });
  return ok(item);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpEquipment.findUnique({ where: { id: id } });
  if (!existing) return notFound('Equipment not found');

  await prisma.erpEquipment.delete({ where: { id: id } });
  return ok({ success: true });
}

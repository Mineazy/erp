import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok } from '@/lib/api';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const movement = await prisma.erpStockMovement.findUnique({
    where: { id },
  });

  if (!movement) return notFound('Stock movement not found');

  let fromWarehouse = null;
  let toWarehouse = null;

  if (movement.fromWarehouseId) {
    fromWarehouse = await prisma.erpWarehouse.findUnique({
      where: { id: movement.fromWarehouseId },
      select: { name: true, code: true },
    });
  }
  if (movement.toWarehouseId) {
    toWarehouse = await prisma.erpWarehouse.findUnique({
      where: { id: movement.toWarehouseId },
      select: { name: true, code: true },
    });
  }

  const user = await prisma.erpUser.findUnique({
    where: { id: movement.userId },
    select: { name: true },
  });

  const branch = movement.branchId
    ? await prisma.erpBranch.findUnique({ where: { id: movement.branchId }, select: { name: true } })
    : null;

  const voucher = {
    title: 'STOCK MOVEMENT VOUCHER',
    movementNo: movement.movementNo,
    type: movement.type,
    productName: movement.productName,
    quantity: Number(movement.quantity),
    fromWarehouse: fromWarehouse ? `${fromWarehouse.name} (${fromWarehouse.code})` : 'N/A',
    toWarehouse: toWarehouse ? `${toWarehouse.name} (${toWarehouse.code})` : 'N/A',
    referenceType: movement.referenceType || '',
    referenceId: movement.referenceId || '',
    notes: movement.notes || '',
    requestedBy: user?.name || '',
    branch: branch?.name || '',
    createdAt: movement.createdAt.toISOString(),
    generatedAt: new Date().toISOString(),
  };

  return ok(voucher);
}

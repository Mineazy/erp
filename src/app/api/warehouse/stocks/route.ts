import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, created, getBody } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const warehouseId = searchParams.get('warehouseId');
  const productId = searchParams.get('productId');

  const where: any = {};
  if (warehouseId) where.warehouseId = warehouseId;
  if (productId) where.productId = productId;

  const items = await prisma.erpWarehouseStock.findMany({
    where,
    orderBy: { location: 'asc' },
  });
  return ok(items);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { warehouseId, productId, quantity, location, batchNo, serialNo } = body;

  if (!warehouseId || !productId) return badRequest('Warehouse and product are required');

  const qtyNum = parseFloat((quantity as string) || '0');

  const existing = await prisma.erpWarehouseStock.findFirst({
    where: { warehouseId: warehouseId as string, productId: productId as string },
  });

  if (existing) {
    const item = await prisma.erpWarehouseStock.update({
      where: { id: existing.id },
      data: {
        quantity: Number(existing.quantity) + qtyNum,
        ...(location !== undefined && { location: location as string }),
        ...(batchNo !== undefined && { batchNo: batchNo as string | null }),
        ...(serialNo !== undefined && { serialNo: serialNo as string | null }),
      },
    });
    return ok(item);
  }

  const item = await prisma.erpWarehouseStock.create({
    data: {
      warehouseId: warehouseId as string,
      productId: productId as string,
      quantity: qtyNum,
      location: (location as string) || '',
      batchNo: (batchNo as string) || '',
      serialNo: (serialNo as string) || '',
    },
  });
  return created(item);
}

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok } from '@/lib/api';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const product = await prisma.erpProduct.findUnique({ where: { id } });
  if (!product) return notFound('Product not found');

  const warehouseStocks = await prisma.erpWarehouseStock.findMany({
    where: { productId: id },
    include: { warehouse: { select: { id: true, name: true, code: true } } },
    orderBy: { warehouse: { name: 'asc' } },
  });

  const items = warehouseStocks.map((ws) => ({
    warehouseId: ws.warehouseId,
    warehouseName: ws.warehouse.name,
    warehouseCode: ws.warehouse.code,
    quantity: Number(ws.quantity),
    location: ws.location,
    batchNo: ws.batchNo,
  }));

  if (items.length === 0) {
    const branchStocks = await prisma.erpBranchStock.aggregate({
      where: { productId: id },
      _sum: { quantity: true }
    });
    const totalBranchStock = Number(branchStocks._sum.quantity || 0);

    items.push({
      warehouseId: '',
      warehouseName: 'Default (Branch Stock)',
      warehouseCode: '',
      quantity: totalBranchStock,
      location: product.location,
      batchNo: null,
    });
  }

  return ok(items);
}

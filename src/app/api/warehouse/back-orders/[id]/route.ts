import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody } from '@/lib/api';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const backOrder = await prisma.erpBackOrder.findUnique({
    where: { id },
    include: {
      branch: true,
      lines: true,
      activities: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!backOrder) return notFound('Back order not found');

  const dcWarehouse = await prisma.erpWarehouse.findFirst({
    where: { OR: [{ code: 'DC' }, { name: { contains: 'DC Warehouse' } }] }
  });

  let linesWithStock = [...backOrder.lines];
  if (dcWarehouse) {
    const productIds = backOrder.lines.map(l => l.productId);
    const stocks = await prisma.erpWarehouseStock.groupBy({
      by: ['productId'],
      where: { warehouseId: dcWarehouse.id, productId: { in: productIds } },
      _sum: { quantity: true }
    });
    linesWithStock = backOrder.lines.map(line => {
      const stock = stocks.find(s => s.productId === line.productId);
      return { ...line, availableStock: Number(stock?._sum.quantity || 0) };
    });
  }

  return ok({ ...backOrder, lines: linesWithStock, dcWarehouseId: dcWarehouse?.id });
}

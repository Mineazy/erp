import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, created, getBody, getNextSequence } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status');

  const where: any = {};
  if (search) {
    where.OR = [
      { countNo: { contains: search } },
      { notes: { contains: search } },
    ];
  }
  if (status) where.status = status;

  const items = await prisma.erpCycleCount.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return ok(items);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { warehouseId, countedBy, notes } = body;
  const lines = body.lines as any[];

  if (!warehouseId || !countedBy) return badRequest('Warehouse and counted by are required');

  const countNo = await getNextSequence(prisma, 'erpCycleCount', 'countNo', 'CC');

  if (lines && lines.length) {
    const lineData = lines.map((l: any) => ({
      productId: l.productId,
      productName: l.productName,
      expectedQty: parseFloat(l.expectedQty || '0'),
      countedQty: parseFloat(l.countedQty || '0'),
      variance: (parseFloat(l.countedQty || '0') - parseFloat(l.expectedQty || '0')),
      notes: l.notes || '',
    }));

    const item = await prisma.erpCycleCount.create({
      data: {
        countNo,
        warehouseId: warehouseId as string,
        countedBy: countedBy as string,
        notes: (notes as string) || '',
        lines: { create: lineData },
      },
      include: { lines: true },
    });
    return created(item);
  }

  const item = await prisma.erpCycleCount.create({
    data: {
      countNo,
      warehouseId: warehouseId as string,
      countedBy: countedBy as string,
      notes: (notes as string) || '',
    },
  });
  return created(item);
}

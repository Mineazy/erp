import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody, badRequest } from '@/lib/api';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const item = await prisma.erpCycleCount.findUnique({
    where: { id: id },
    include: { lines: true },
  });
  if (!item) return notFound('Cycle count not found');
  return ok(item);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpCycleCount.findUnique({ where: { id: id } });
  if (!existing) return notFound('Cycle count not found');

  const body = await getBody(request);
  const lines = body.lines as any[];

  const data: any = {};
  if (body.warehouseId !== undefined) data.warehouseId = body.warehouseId as string;
  if (body.status !== undefined) data.status = body.status as string;
  if (body.countedBy !== undefined) data.countedBy = body.countedBy as string;
  if (body.countedAt !== undefined) data.countedAt = body.countedAt ? new Date(body.countedAt as string) : null;
  if (body.approvedBy !== undefined) data.approvedBy = body.approvedBy as string | null;
  if (body.notes !== undefined) data.notes = body.notes as string | null;

  if (lines) {
    if (!lines.length) return badRequest('At least one line item required');

    const lineData = lines.map((l: any) => {
      const expected = parseFloat(l.expectedQty || '0');
      const counted = parseFloat(l.countedQty || '0');
      return {
        productId: l.productId,
        productName: l.productName,
        expectedQty: expected,
        countedQty: counted,
        variance: counted - expected,
        notes: l.notes || '',
      };
    });

    await prisma.erpCycleCountLine.deleteMany({ where: { countId: id } });
    data.lines = { create: lineData };
  }

  const item = await prisma.erpCycleCount.update({
    where: { id: id },
    data,
    include: { lines: true },
  });

  return ok(item);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpCycleCount.findUnique({ where: { id: id } });
  if (!existing) return notFound('Cycle count not found');

  await prisma.erpCycleCount.delete({ where: { id: id } });
  return ok({ success: true });
}

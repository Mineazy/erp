import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, badRequest, ok } from '@/lib/api';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const item = await prisma.erpGoodsReceipt.findUnique({
    where: { id },
    include: {
      lines: true,
      po: { select: { poNumber: true, supplierName: true } },
    },
  });

  if (!item) return notFound('Goods receipt not found');
  return ok(item);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpGoodsReceipt.findUnique({ where: { id } });
  if (!existing) return notFound('Goods receipt not found');

  const body = await request.json();
  const { notes, inspectedBy, inspectionStatus, status, lines } = body;

  if (lines && Array.isArray(lines) && lines.length > 0) {
    await prisma.erpGoodsReceiptLine.deleteMany({ where: { receiptId: id } });

    for (const line of lines as any[]) {
      await prisma.erpGoodsReceiptLine.create({
        data: {
          receiptId: id,
          productId: line.productId,
          productName: line.productName,
          poLineId: line.poLineId || '',
          quantity: parseFloat(line.quantity) || 0,
          batchNo: line.batchNo || null,
          serialNo: line.serialNo || null,
          location: line.location || null,
        },
      });
    }
  }

  const updated = await prisma.erpGoodsReceipt.update({
    where: { id },
    data: {
      notes: notes !== undefined ? (notes as string) : undefined,
      inspectedBy: inspectedBy !== undefined ? (inspectedBy as string) : undefined,
      inspectionStatus: inspectionStatus !== undefined ? (inspectionStatus as string) : undefined,
      status: status !== undefined ? (status as string) : undefined,
    },
    include: { lines: true, po: { select: { poNumber: true, supplierName: true } } },
  });

  return ok(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpGoodsReceipt.findUnique({ where: { id } });
  if (!existing) return notFound('Goods receipt not found');

  await prisma.erpGoodsReceipt.delete({ where: { id } });
  return ok({ success: true });
}

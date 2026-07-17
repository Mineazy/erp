import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok } from '@/lib/api';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const receipt = await prisma.erpGoodsReceipt.findUnique({
    where: { id },
    include: {
      lines: true,
      po: {
        select: { poNumber: true, supplierName: true, orderDate: true },
      },
    },
  });

  if (!receipt) return notFound('Goods receipt not found');

  if (receipt.status === 'draft') {
    await prisma.erpGoodsReceipt.update({
      where: { id },
      data: { status: 'generated' },
    });
  }

  const branch = receipt.branchId
    ? await prisma.erpBranch.findUnique({ where: { id: receipt.branchId }, select: { name: true } })
    : null;

  const voucher = {
    title: 'GOODS RECEIVED VOUCHER',
    receiptNo: receipt.receiptNo,
    receiptDate: receipt.receivedAt.toISOString(),
    poNumber: receipt.po?.poNumber || '',
    supplierName: receipt.supplierName || receipt.po?.supplierName || '',
    status: receipt.status === 'draft' ? 'generated' : receipt.status,
    inspectedBy: receipt.inspectedBy || '',
    inspectionStatus: receipt.inspectionStatus || '',
    notes: receipt.notes || '',
    branch: branch?.name || '',
    lines: receipt.lines.map((l) => ({
      productName: l.productName,
      quantity: Number(l.quantity),
      batchNo: l.batchNo || '',
      serialNo: l.serialNo || '',
      location: l.location || '',
    })),
    generatedAt: new Date().toISOString(),
  };

  return ok(voucher);
}

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

  const note = await prisma.erpDispatchNote.findUnique({
    where: { id },
    include: { lines: true },
  });

  if (!note) return notFound('Dispatch note not found');

  if (note.status === 'draft') {
    await prisma.erpDispatchNote.update({
      where: { id },
      data: { status: 'generated' },
    });
  }

  const branch = note.branchId
    ? await prisma.erpBranch.findUnique({ where: { id: note.branchId }, select: { name: true } })
    : null;

  const voucher = {
    title: 'DISPATCH NOTE',
    dispatchNo: note.dispatchNo,
    dispatchDate: note.dispatchDate.toISOString(),
    customerName: note.customerName || '',
    vehicleNo: note.vehicleNo || '',
    driverName: note.driverName || '',
    deliveryAddress: note.deliveryAddress || '',
    notes: note.notes || '',
    branch: branch?.name || '',
    lines: note.lines.map((l) => ({
      productName: l.productName,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
      total: Number(l.quantity) * Number(l.unitPrice),
      batchNo: l.batchNo || '',
    })),
    generatedAt: new Date().toISOString(),
  };

  return ok(voucher);
}

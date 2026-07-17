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

  const item = await prisma.erpDispatchNote.findUnique({
    where: { id },
    include: { lines: true },
  });

  if (!item) return notFound('Dispatch note not found');
  return ok(item);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpDispatchNote.findUnique({ where: { id } });
  if (!existing) return notFound('Dispatch note not found');

  const body = await request.json();
  const { customerName, vehicleNo, driverName, deliveryAddress, notes, status, lines } = body;

  if (lines && Array.isArray(lines) && lines.length > 0) {
    await prisma.erpDispatchNoteLine.deleteMany({ where: { dispatchId: id } });

    for (const line of lines as any[]) {
      await prisma.erpDispatchNoteLine.create({
        data: {
          dispatchId: id,
          productId: line.productId,
          productName: line.productName,
          quantity: parseFloat(line.quantity) || 0,
          unitPrice: parseFloat(line.unitPrice) || 0,
          batchNo: line.batchNo || null,
        },
      });
    }
  }

  const updated = await prisma.erpDispatchNote.update({
    where: { id },
    data: {
      customerName: customerName !== undefined ? (customerName as string) : undefined,
      vehicleNo: vehicleNo !== undefined ? (vehicleNo as string) : undefined,
      driverName: driverName !== undefined ? (driverName as string) : undefined,
      deliveryAddress: deliveryAddress !== undefined ? (deliveryAddress as string) : undefined,
      notes: notes !== undefined ? (notes as string) : undefined,
      status: status !== undefined ? (status as string) : undefined,
    },
    include: { lines: true },
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

  const existing = await prisma.erpDispatchNote.findUnique({ where: { id } });
  if (!existing) return notFound('Dispatch note not found');

  if (existing.status === 'generated') {
    await prisma.erpDispatchNoteLine.deleteMany({ where: { dispatchId: id } });
    await prisma.erpDispatchNote.delete({ where: { id } });
  } else {
    await prisma.erpDispatchNote.delete({ where: { id } });
  }

  return ok({ success: true });
}

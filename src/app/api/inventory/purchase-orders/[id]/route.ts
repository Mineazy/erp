import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody, badRequest } from '@/lib/api';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const order = await prisma.erpPurchaseOrder.findUnique({
    where: { id: params.id },
    include: { lines: true },
  });
  if (!order) return notFound('Purchase order not found');

  return ok(order);
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpPurchaseOrder.findUnique({ where: { id: params.id } });
  if (!existing) return notFound('Purchase order not found');

  const body = await getBody(request);
  const { supplierId, supplierName, orderDate, expectedDate, status, notes, taxAmount } = body;
  const lines = body.lines as any[];

  if (lines) {
    if (!lines.length) return badRequest('At least one line item required');

    let subtotal = 0;
    const lineData = (lines as any[]).map((l: any) => {
      const total = parseFloat(l.quantity) * parseFloat(l.unitPrice);
      subtotal += total;
      return {
        productId: l.productId,
        productName: l.productName,
        quantity: parseFloat(l.quantity),
        unitPrice: parseFloat(l.unitPrice),
        total,
      };
    });

    const tx = parseFloat((taxAmount as string) || '0');
    const total = subtotal + tx;

    await prisma.erpPurchaseOrderLine.deleteMany({ where: { poId: params.id } });

    const order = await prisma.erpPurchaseOrder.update({
      where: { id: params.id },
      data: {
        ...(supplierId !== undefined && { supplierId: supplierId as string }),
        ...(supplierName !== undefined && { supplierName: supplierName as string }),
        ...(orderDate !== undefined && { orderDate: new Date(orderDate as string) }),
        ...(expectedDate !== undefined && { expectedDate: expectedDate ? new Date(expectedDate as string) : null }),
        ...(status !== undefined && { status: status as string }),
        ...(notes !== undefined && { notes: notes as string | null }),
        subtotal,
        taxAmount: tx,
        total,
        lines: { create: lineData },
      },
      include: { lines: true },
    });

    return ok(order);
  }

  const order = await prisma.erpPurchaseOrder.update({
    where: { id: params.id },
    data: {
      ...(supplierId !== undefined && { supplierId: supplierId as string }),
      ...(supplierName !== undefined && { supplierName: supplierName as string }),
      ...(orderDate !== undefined && { orderDate: new Date(orderDate as string) }),
      ...(expectedDate !== undefined && { expectedDate: expectedDate ? new Date(expectedDate as string) : null }),
      ...(status !== undefined && { status: status as string }),
      ...(notes !== undefined && { notes: notes as string | null }),
      ...(taxAmount !== undefined && { taxAmount: parseFloat(taxAmount as string) }),
    },
  });

  return ok(order);
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpPurchaseOrder.findUnique({ where: { id: params.id } });
  if (!existing) return notFound('Purchase order not found');

  await prisma.erpPurchaseOrder.delete({ where: { id: params.id } });
  return ok({ success: true });
}

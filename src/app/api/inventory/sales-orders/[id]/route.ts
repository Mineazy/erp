import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody, badRequest } from '@/lib/api';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const order = await prisma.erpSalesOrder.findUnique({
    where: { id: params.id },
    include: { lines: true },
  });
  if (!order) return notFound('Sales order not found');

  return ok(order);
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpSalesOrder.findUnique({ where: { id: params.id } });
  if (!existing) return notFound('Sales order not found');

  const body = await getBody(request);
  const { customerId, customerName, orderDate, status, notes, taxAmount, discount } = body;
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
    const disc = parseFloat((discount as string) || '0');
    const total = subtotal + tx - disc;

    await prisma.erpSalesOrderLine.deleteMany({ where: { orderId: params.id } });

    const order = await prisma.erpSalesOrder.update({
      where: { id: params.id },
      data: {
        ...(customerId !== undefined && { customerId: customerId as string }),
        ...(customerName !== undefined && { customerName: customerName as string }),
        ...(orderDate !== undefined && { orderDate: new Date(orderDate as string) }),
        ...(status !== undefined && { status: status as string }),
        ...(notes !== undefined && { notes: notes as string | null }),
        subtotal,
        taxAmount: tx,
        discount: disc,
        total,
        lines: { create: lineData },
      },
      include: { lines: true },
    });

    return ok(order);
  }

  const order = await prisma.erpSalesOrder.update({
    where: { id: params.id },
    data: {
      ...(customerId !== undefined && { customerId: customerId as string }),
      ...(customerName !== undefined && { customerName: customerName as string }),
      ...(orderDate !== undefined && { orderDate: new Date(orderDate as string) }),
      ...(status !== undefined && { status: status as string }),
      ...(notes !== undefined && { notes: notes as string | null }),
      ...(taxAmount !== undefined && { taxAmount: parseFloat(taxAmount as string) }),
      ...(discount !== undefined && { discount: parseFloat(discount as string) }),
    },
  });

  return ok(order);
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpSalesOrder.findUnique({ where: { id: params.id } });
  if (!existing) return notFound('Sales order not found');

  await prisma.erpSalesOrder.delete({ where: { id: params.id } });
  return ok({ success: true });
}

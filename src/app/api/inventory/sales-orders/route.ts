import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, created, ok, getBody, getNextSequence, parseListParams } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const sp = parseListParams(request.nextUrl.searchParams);
  const search = sp.search;
  const status = sp.status;
  const sort = sp.sort || 'createdAt';
  const order = sp.order || 'desc';
  const page = sp.page || 1;
  const limit = sp.limit || 50;
  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { orderNumber: { contains: search } },
      { customerName: { contains: search } },
      { customerId: { contains: search } },
    ];
  }
  if (status) where.status = status;

  const orderBy: Record<string, 'asc' | 'desc'> = {};
  orderBy[sort] = order;

  const [items, total] = await Promise.all([
    prisma.erpSalesOrder.findMany({
      where,
      orderBy: orderBy as any,
      skip: (page - 1) * limit,
      take: limit,
      include: { lines: true },
    }),
    prisma.erpSalesOrder.count({ where }),
  ]);

  return ok({ items, total, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { customerId, customerName, orderDate, notes, taxAmount, discount } = body;
  const lines = body.lines as any[];
  if (!customerId || !customerName || !lines?.length) return badRequest('Customer and line items required');

  const orderNumber = await getNextSequence(prisma, 'erpSalesOrder', 'orderNumber', 'SO');
  let subtotal = 0;
  const lineData = lines.map((l: any) => {
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

  const order = await prisma.erpSalesOrder.create({
    data: {
      orderNumber,
      customerId: customerId as string,
      customerName: customerName as string,
      orderDate: new Date(orderDate as string),
      subtotal,
      taxAmount: tx,
      discount: disc,
      total,
      notes: notes as string | undefined,
      lines: { create: lineData },
    },
    include: { lines: true },
  });

  return created(order);
}

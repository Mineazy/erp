import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, created, ok, getBody, getNextSequence } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = request.nextUrl;
  const sessionId = searchParams.get('sessionId');
  const status = searchParams.get('status');

  const where: Record<string, unknown> = {};
  if (sessionId) where.sessionId = sessionId;
  if (status) where.status = status;

  const [items, total] = await Promise.all([
    prisma.erpPosTransaction.findMany({
      where,
      include: { lines: true, payments: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.erpPosTransaction.count({ where }),
  ]);

  return ok({ items, total });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const sessionId = body.sessionId as string | undefined;
  const customerId = body.customerId as string | undefined;
  const customerName = body.customerName as string | undefined;
  const lines = body.lines as any[] | undefined;
  const payments = body.payments as any[] | undefined;
  const taxAmount = body.taxAmount as string | undefined;
  const discount = body.discount as string | undefined;

  if (!sessionId || !lines?.length) return badRequest('Session and line items required');

  const posSession = await prisma.erpPosSession.findUnique({ where: { id: sessionId as string } });
  if (!posSession || posSession.status !== 'open') return badRequest('Session not found or not open');

  let subtotal = 0;
  const lineData = [];
  for (const l of lines) {
    const qty = parseFloat(l.quantity);
    const price = parseFloat(l.unitPrice);
    const total = qty * price;
    subtotal += total;
    lineData.push({
      productId: l.productId,
      productName: l.productName,
      quantity: qty,
      unitPrice: price,
      total,
    });
    await prisma.erpProduct.update({
      where: { id: l.productId },
      data: { stock: { decrement: qty } },
    });
  }

  const tx = parseFloat(taxAmount || '0');
  const disc = parseFloat(discount || '0');
  const total = subtotal + tx - disc;
  const paid = parseFloat(payments?.[0]?.amount) || total;
  const change = Math.max(0, paid - total);

  const transactionNumber = await getNextSequence(prisma, 'erpPosTransaction', 'transactionNumber', 'TXN');

  const transaction = await prisma.erpPosTransaction.create({
    data: {
      transactionNumber,
      sessionId,
      customerId: customerId,
      customerName: customerName,
      subtotal,
      taxAmount: tx,
      discount: disc,
      total,
      paidAmount: paid,
      changeAmount: change,
      paymentMethod: (payments?.[0]?.method) || 'cash',
      lines: { create: lineData },
      payments: payments
        ? {
            create: payments.map((p: any) => ({
              method: p.method,
              amount: parseFloat(p.amount),
              reference: p.reference,
            })),
          }
        : undefined,
    },
    include: { lines: true, payments: true },
  });

  await prisma.erpPosSession.update({
    where: { id: sessionId },
    data: { totalSales: { increment: total } },
  });

  return created(transaction);
}

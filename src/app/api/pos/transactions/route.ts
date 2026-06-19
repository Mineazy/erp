import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, created, ok, getBody, getNextSequence, getBranchFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = request.nextUrl;
  const sessionId = searchParams.get('sessionId');
  const status = searchParams.get('status');

  const branchFilter = getBranchFilter(session);
  const where: Record<string, unknown> = {};
  Object.assign(where, branchFilter);
  if (sessionId) where.sessionId = sessionId;
  if (status) where.status = status;

  const [items, total] = await Promise.all([
    prisma.erpPosTransaction.findMany({
      where,
      include: { lines: true, payments: true, branch: { select: { id: true, code: true, name: true } } },
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
  }

  const tx = parseFloat(taxAmount || '0');
  const disc = parseFloat(discount || '0');
  const total = subtotal + tx - disc;
  const paid = payments ? payments.reduce((s: number, p: any) => s + parseFloat(p.amount || '0'), 0) : total;
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
      branchId: (session.user as any)?.branchId || null,
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

  for (const l of lineData) {
    await prisma.erpProduct.update({
      where: { id: l.productId },
      data: { stock: { decrement: l.quantity } },
    });
    const movementNo = await getNextSequence(prisma, 'erpStockMovement', 'movementNo', 'MOV');
    await prisma.erpStockMovement.create({
      data: {
        movementNo,
        type: 'out',
        productId: l.productId,
        productName: l.productName,
        quantity: l.quantity,
        referenceType: 'pos',
        referenceId: transaction.id,
        userId: (session.user as any).email || 'unknown',
      branchId: (session.user as any)?.branchId || null,
      },
    });
  }

  const pmUpdates: Record<string, any> = {};
  for (const p of (payments || [])) {
    const field = p.method === 'cash' ? 'cashSales'
      : p.method === 'bank_transfer' ? 'cardSales'
      : p.method === 'mobile_wallet' ? 'mobileSales'
      : p.method === 'credit' ? 'creditSales'
      : null;
    if (field) {
      pmUpdates[field] = { increment: parseFloat(p.amount) };
    }
  }

  await prisma.erpPosSession.update({
    where: { id: sessionId },
    data: { totalSales: { increment: total }, ...pmUpdates },
  });

  return created(transaction);
}

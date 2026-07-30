import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, created, ok, getBody, getNextSequence, getBranchFilter } from '@/lib/api';

const SESSION_MAX_MS = 24 * 60 * 60 * 1000;

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
      include: {
        lines: true,
        payments: true,
        branch: { select: { id: true, code: true, name: true, address: true, city: true, country: true, phone: true, email: true } }
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.erpPosTransaction.count({ where }),
  ]);

  return ok({ items, total });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();


    const body = await getBody(request);
    const sessionId = body.sessionId as string | undefined;
    const customerId = body.customerId as string | undefined;
    const customerName = body.customerName as string | undefined;
    const linkedMobileOrderId = body.linkedMobileOrderId as string | undefined;
    const lines = body.lines as any[] | undefined;
    const payments = body.payments as any[] | undefined;
    const taxAmount = body.taxAmount as string | undefined;
    const discount = body.discount as string | undefined;

    if (!sessionId || !lines?.length) return badRequest('Session and line items required');

    const posSession = await prisma.erpPosSession.findUnique({ where: { id: sessionId as string } });
    if (!posSession || posSession.status !== 'open') return badRequest('Session not found or not open');

    const now = new Date();
    const openedAt = new Date(posSession.openedAt);
    if (now.getTime() - openedAt.getTime() >= SESSION_MAX_MS) {
      await prisma.erpPosSession.update({
        where: { id: sessionId },
        data: {
          status: 'closed',
          closedAt: now,
          closedBy: 'system',
          notes: (posSession.notes || '') + '\nSYSTEM: Auto-closed (24h limit exceeded)',
          closingBalance: posSession.totalSales,
        },
      });
      return badRequest('Session has expired (24h limit reached). Please close it and open a new session.');
    }

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

    let actualChangeAmount = change;
    let cardBalanceIncrement = 0;
    if (body.transferChangeToCard && change > 0 && customerId) {
      cardBalanceIncrement = change;
      actualChangeAmount = 0;
    }

    let pointsDeducted = 0;
    let balanceDeducted = 0;
    if (payments) {
      for (const p of payments) {
        if (p.method === 'loyalty_points') {
          pointsDeducted += Math.ceil(parseFloat(p.amount || '0'));
        } else if (p.method === 'loyalty_card_balance') {
          balanceDeducted += parseFloat(p.amount || '0');
        }
      }
    }

    if (customerId && (pointsDeducted > 0 || balanceDeducted > 0)) {
      const customer = await prisma.erpCustomer.findUnique({ where: { id: customerId } });
      if (!customer) return badRequest('Customer not found for loyalty payment');
      if (customer.loyaltyPoints < pointsDeducted) {
        return badRequest(`Insufficient loyalty points (Available: ${customer.loyaltyPoints}, Required: ${pointsDeducted})`);
      }
      if (Number(customer.cardBalance) < balanceDeducted) {
        return badRequest(`Insufficient card balance (Available: $${Number(customer.cardBalance).toFixed(2)}, Required: $${balanceDeducted.toFixed(2)})`);
      }
    }

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
        changeAmount: actualChangeAmount,
        paymentMethod: (payments?.[0]?.method) || 'cash',
        branchId: (session.user as any)?.branchId || null,
        lines: { create: lineData },
        payments: payments
          ? {
              create: payments.map((p: any) => ({
                method: p.method,
                amount: parseFloat(p.amount),
                reference: p.reference,
                currency: p.currency || 'USD',
                exchangeRate: parseFloat(p.exchangeRate || '1'),
              })),
            }
          : undefined,
      },
      include: { lines: true, payments: true, branch: true },
    });

    if (customerId) {
      try {
        const customer = await prisma.erpCustomer.findUnique({ where: { id: customerId } });
        if (customer) {
          const oldRemainder = Number(customer.totalSpent) % 1000;
          const newlyEarnedPoints = Math.floor((oldRemainder + total) / 1000);
          const newTotalSpent = Number(customer.totalSpent) + total;
          const finalPoints = Math.max(0, customer.loyaltyPoints + newlyEarnedPoints - pointsDeducted);
          const finalCardBalance = Math.max(0, Number(customer.cardBalance) + cardBalanceIncrement - balanceDeducted);

          await prisma.erpCustomer.update({
            where: { id: customerId },
            data: {
              totalSpent: newTotalSpent,
              loyaltyPoints: finalPoints,
              cardBalance: finalCardBalance,
            },
          });
        }
      } catch (err) {
        console.error('Failed to update customer loyalty:', err);
      }
    }

    if (linkedMobileOrderId) {
      try {
        await prisma.erpSalesOrder.update({
          where: { id: linkedMobileOrderId },
          data: { status: 'completed' }
        });
      } catch (err) {
        console.error('Failed to update mobile order status:', err);
      }
    }

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
  } catch (error: any) {
    console.error('POST Transaction Error:', error);
    try {
      require('fs').writeFileSync('scratch/last_error.log', error.stack || error.message || String(error));
    } catch(e) {}
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

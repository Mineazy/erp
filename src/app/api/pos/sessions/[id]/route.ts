import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, badRequest, ok, getBody } from '@/lib/api';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const posSession = await prisma.erpPosSession.findUnique({
    where: { id: id },
    include: {
      transactions: {
        include: { lines: true, payments: true },
        orderBy: { createdAt: 'desc' },
      },
      _count: { select: { transactions: true } },
    },
  });

  if (!posSession) return notFound('POS session not found');
  return ok(posSession);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpPosSession.findUnique({ where: { id: id } });
  if (!existing) return notFound('POS session not found');
  if (existing.status !== 'open') return badRequest('Session is already closed');

  const body = await getBody(request);
  const { closingBalance, notes } = body;

  if (closingBalance === undefined) return badRequest('Closing balance is required');

  const actualCash = parseFloat(closingBalance as string);

  // Fetch transactions for the session to compute totals
  const transactions = await prisma.erpPosTransaction.findMany({
    where: { sessionId: id, status: { in: ['completed', 'voided'] } },
    include: { payments: true }
  });

  let totalSales = 0;
  let totalRefunds = 0; 
  let totalTax = 0;
  let totalDiscounts = 0;
  let cashSales = 0;
  let cardSales = 0;
  let mobileSales = 0;
  let creditSales = 0;

  for (const t of transactions) {
    if (t.status === 'voided') {
      totalRefunds += Number(t.total);
      continue;
    }

    totalSales += Number(t.total);
    totalTax += Number(t.taxAmount);
    totalDiscounts += Number(t.discount);
    
    for (const p of t.payments) {
      const amt = Number(p.amount) / Number(p.exchangeRate);
      if (p.method === 'cash') cashSales += amt;
      else if (p.method === 'card' || p.method === 'credit_card' || p.method === 'debit_card' || p.method === 'bank_transfer') cardSales += amt;
      else if (p.method === 'mobile' || p.method === 'mobile_wallet' || p.method.startsWith('paynow_')) mobileSales += amt;
      else if (p.method === 'credit' || p.method.startsWith('loyalty_')) creditSales += amt;
    }
  }

  // Adjust cash sales for change given out
  for (const t of transactions) {
    if (Number(t.changeAmount) > 0) {
       cashSales -= (Number(t.changeAmount) / Number(t.exchangeRate));
    }
  }

  const expectedCash = Number(existing.openingBalance) + cashSales - totalRefunds;
  const cashDifference = actualCash - expectedCash;

  const closedAt = new Date();
  const closedBy = (session.user as any).email || 'unknown';

  const posSession = await prisma.$transaction(async (tx) => {
    const updated = await tx.erpPosSession.update({
      where: { id: id },
      data: {
        status: 'closed',
        closedAt: closedAt,
        closedBy: closedBy,
        closingBalance: actualCash,
        ...(notes !== undefined && { notes: notes as string }),
      },
    });

    await tx.erpZReport.create({
      data: {
        reportNumber: `Z-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        sessionId: id,
        branchId: existing.branchId,
        openedAt: existing.openedAt,
        closedAt: closedAt,
        generatedBy: closedBy,
        totalSales,
        totalRefunds,
        totalTax,
        totalDiscounts,
        cashSales,
        cardSales,
        mobileSales,
        creditSales,
        expectedCash,
        actualCash,
        cashDifference,
      }
    });

    return updated;
  });

  return ok(posSession);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpPosSession.findUnique({ where: { id: id } });
  if (!existing) return notFound('POS session not found');

  await prisma.erpPosSession.delete({ where: { id: id } });
  return ok({ success: true });
}

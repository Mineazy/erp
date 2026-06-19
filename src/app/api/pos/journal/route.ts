import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok, getBranchFilter } from '@/lib/api';

async function findAccounts() {
  const all = await prisma.erpChartOfAccounts.findMany({
    where: { isHeader: false },
    orderBy: { code: 'asc' },
  });

  const revenueAcct = all.find(
    (a) => a.type === 'revenue' && /revenue|sales|income/i.test(a.name),
  ) || all.find((a) => a.type === 'revenue');

  const cashAcct = all.find(
    (a) => a.type === 'asset' && /cash/i.test(a.name),
  );
  const bankAcct = all.find(
    (a) => a.type === 'asset' && /bank/i.test(a.name),
  );
  const mobileAcct = all.find(
    (a) => a.type === 'asset' && /mobile/i.test(a.name),
  );
  const creditAcct = all.find(
    (a) => a.type === 'liability' && /credit/i.test(a.name),
  );

  return { revenueAcct, cashAcct, bankAcct, mobileAcct, creditAcct, all };
}

function pickAccount(method: string, accounts: Awaited<ReturnType<typeof findAccounts>>) {
  switch (method) {
    case 'cash': return accounts.cashAcct || accounts.all.find(a => a.type === 'asset');
    case 'bank_transfer': return accounts.bankAcct || accounts.cashAcct || accounts.all.find(a => a.type === 'asset');
    case 'mobile_wallet': return accounts.mobileAcct || accounts.cashAcct || accounts.all.find(a => a.type === 'asset');
    case 'credit': return accounts.creditAcct || accounts.all.find(a => a.type === 'liability');
    default: return accounts.all.find(a => a.type === 'asset');
  }
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const sessionId = searchParams.get('sessionId');

  const branchFilter = getBranchFilter(session);
  const where: any = {};
  Object.assign(where, branchFilter);
  if (sessionId) where.sessionId = sessionId;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }

  const transactions = await prisma.erpPosTransaction.findMany({
    where,
    include: { lines: true, payments: true, session: true, branch: { select: { id: true, code: true, name: true } } },
    orderBy: [{ createdAt: 'desc' }],
  });

  const accounts = await findAccounts();

  let totalDebit = 0;
  let totalCredit = 0;
  const lines: any[] = [];

  for (const tx of transactions) {
    const total = Number(tx.total);

    // Credit: Sales Revenue
    lines.push({
      id: `${tx.id}-cr`,
      date: tx.createdAt,
      documentNo: tx.transactionNumber,
      description: `POS Sale — ${tx.lines.map(l => `${l.productName} x${l.quantity}`).join(', ')}`,
      accountId: accounts.revenueAcct?.id || '',
      accountName: accounts.revenueAcct?.name || 'Sales Revenue',
      accountCode: accounts.revenueAcct?.code || 'N/A',
      debit: 0,
      credit: total,
      entryType: 'cr',
      method: 'sales_revenue',
      status: tx.status,
      customerName: tx.customerName || null,
      branchName: tx.branch?.name || null,
    });

    totalCredit += total;

    // Debit(s): payment methods
    const txPayments = tx.payments.length > 0 ? tx.payments : [{ method: tx.paymentMethod, amount: total, reference: null }];
    for (const pm of txPayments) {
      const amt = Number(pm.amount);
      const acct = pickAccount(pm.method, accounts);
      const label = pm.method === 'cash' ? 'Cash'
        : pm.method === 'bank_transfer' ? 'Bank Transfer'
        : pm.method === 'mobile_wallet' ? 'Mobile Wallet'
        : pm.method === 'credit' ? 'Credit' : pm.method;

      lines.push({
        id: `${tx.id}-dr-${pm.method}`,
        date: tx.createdAt,
        documentNo: tx.transactionNumber,
        description: `${label}${pm.reference ? ` (Ref: ${pm.reference})` : ''} — ${tx.lines.map(l => `${l.productName} x${l.quantity}`).join(', ')}`,
        accountId: acct?.id || '',
        accountName: acct?.name || label,
        accountCode: acct?.code || 'N/A',
        debit: amt,
        credit: 0,
        entryType: 'dr',
        method: pm.method,
        status: tx.status,
        customerName: tx.customerName || null,
        branchName: tx.branch?.name || null,
      });

      totalDebit += amt;
    }
  }

  return ok({
    lines,
    accounts: {
      revenueAccount: accounts.revenueAcct ? { id: accounts.revenueAcct.id, name: accounts.revenueAcct.name, code: accounts.revenueAcct.code } : null,
    },
    totals: {
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      entryCount: transactions.length,
      lineCount: lines.length,
    },
  });
}

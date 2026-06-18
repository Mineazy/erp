import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok } from '@/lib/api';

async function findAccounts() {
  const all = await prisma.erpChartOfAccounts.findMany({
    where: { isHeader: false },
    orderBy: { code: 'asc' },
  });

  const debitAcct = all.find(
    (a) => a.type === 'asset' && /receivable/i.test(a.name),
  ) || all.find((a) => a.type === 'asset');

  const creditAcct = all.find(
    (a) => a.type === 'revenue' && /revenue|sales|income/i.test(a.name),
  ) || all.find((a) => a.type === 'revenue');

  return { debitAccount: debitAcct || null, creditAccount: creditAcct || null, all };
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customerId');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  const where: any = {};
  if (customerId) where.customerId = customerId;
  if (dateFrom || dateTo) {
    where.invoiceDate = {};
    if (dateFrom) where.invoiceDate.gte = new Date(dateFrom);
    if (dateTo) where.invoiceDate.lte = new Date(dateTo);
  }

  const invoices = await prisma.erpAccountReceivable.findMany({
    where,
    orderBy: [{ invoiceDate: 'asc' }, { invoiceNumber: 'asc' }],
  });

  const { debitAccount, creditAccount } = await findAccounts();

  let totalDebit = 0;
  let totalCredit = 0;
  const lines: any[] = [];

  for (const inv of invoices) {
    const amount = Number(inv.amount);

    lines.push({
      id: `${inv.id}-dr`,
      date: inv.invoiceDate,
      documentNo: inv.invoiceNumber,
      description: inv.description || `Invoice ${inv.invoiceNumber}`,
      customerName: inv.customerName,
      accountId: debitAccount?.id || '',
      accountName: debitAccount?.name || 'Accounts Receivable',
      accountCode: debitAccount?.code || 'N/A',
      debit: amount,
      credit: 0,
      entryType: 'dr',
      status: inv.status,
    });

    lines.push({
      id: `${inv.id}-cr`,
      date: inv.invoiceDate,
      documentNo: inv.invoiceNumber,
      description: inv.description || `Invoice ${inv.invoiceNumber}`,
      customerName: inv.customerName,
      accountId: creditAccount?.id || '',
      accountName: creditAccount?.name || 'Sales Revenue',
      accountCode: creditAccount?.code || 'N/A',
      debit: 0,
      credit: amount,
      entryType: 'cr',
      status: inv.status,
    });

    totalDebit += amount;
    totalCredit += amount;
  }

  return ok({
    lines,
    accounts: {
      debitAccount: debitAccount ? { id: debitAccount.id, name: debitAccount.name, code: debitAccount.code } : null,
      creditAccount: creditAccount ? { id: creditAccount.id, name: creditAccount.name, code: creditAccount.code } : null,
    },
    totals: {
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      entryCount: invoices.length,
      lineCount: lines.length,
    },
  });
}

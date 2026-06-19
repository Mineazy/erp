import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok, getBranchFilter } from '@/lib/api';

async function findAccounts() {
  const all = await prisma.erpChartOfAccounts.findMany({
    where: { isHeader: false },
    orderBy: { code: 'asc' },
  });

  const debitAcct = all.find(
    (a) => a.type === 'expense' && /purchases|cogs?cost of sales?|inventory|materials/i.test(a.name),
  ) || all.find((a) => a.type === 'expense');

  const creditAcct = all.find(
    (a) => a.type === 'liability' && /payable/i.test(a.name),
  ) || all.find((a) => a.type === 'liability');

  return { debitAccount: debitAcct || null, creditAccount: creditAcct || null, all };
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const supplierId = searchParams.get('supplierId');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  const branchFilter = getBranchFilter(session);
  const where: any = {};
  Object.assign(where, branchFilter);
  if (supplierId) where.supplierId = supplierId;
  if (dateFrom || dateTo) {
    where.billDate = {};
    if (dateFrom) where.billDate.gte = new Date(dateFrom);
    if (dateTo) where.billDate.lte = new Date(dateTo);
  }

  const bills = await prisma.erpAccountPayable.findMany({
    where,
    orderBy: [{ billDate: 'asc' }, { billNumber: 'asc' }],
  });

  const { debitAccount, creditAccount } = await findAccounts();

  let totalDebit = 0;
  let totalCredit = 0;
  const lines: any[] = [];

  for (const bill of bills) {
    const amount = Number(bill.amount);

    lines.push({
      id: `${bill.id}-dr`,
      date: bill.billDate,
      documentNo: bill.billNumber,
      description: bill.description || `Bill ${bill.billNumber}`,
      supplierName: bill.supplierName,
      accountId: debitAccount?.id || '',
      accountName: debitAccount?.name || 'Purchases',
      accountCode: debitAccount?.code || 'N/A',
      debit: amount,
      credit: 0,
      entryType: 'dr',
      status: bill.status,
    });

    lines.push({
      id: `${bill.id}-cr`,
      date: bill.billDate,
      documentNo: bill.billNumber,
      description: bill.description || `Bill ${bill.billNumber}`,
      supplierName: bill.supplierName,
      accountId: creditAccount?.id || '',
      accountName: creditAccount?.name || 'Accounts Payable',
      accountCode: creditAccount?.code || 'N/A',
      debit: 0,
      credit: amount,
      entryType: 'cr',
      status: bill.status,
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
      entryCount: bills.length,
      lineCount: lines.length,
    },
  });
}

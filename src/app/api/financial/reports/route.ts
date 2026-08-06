import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const now = new Date();
  const currentYearStart = new Date(now.getFullYear(), 0, 1);

  // Total Assets
  const assetAccounts = await prisma.erpChartOfAccounts.findMany({ where: { type: 'asset' } });
  const assetAccountIds = assetAccounts.map(a => a.id);
  const assetLines = await prisma.erpJournalLine.aggregate({
    where: { accountId: { in: assetAccountIds } },
    _sum: { debit: true, credit: true }
  });
  const totalAssets = Number(assetLines._sum.debit || 0) - Number(assetLines._sum.credit || 0);

  // Liabilities
  const liabilityAccounts = await prisma.erpChartOfAccounts.findMany({ where: { type: 'liability' } });
  const liabilityAccountIds = liabilityAccounts.map(a => a.id);
  const liabilityLines = await prisma.erpJournalLine.aggregate({
    where: { accountId: { in: liabilityAccountIds } },
    _sum: { debit: true, credit: true }
  });
  const totalLiabilities = Number(liabilityLines._sum.credit || 0) - Number(liabilityLines._sum.debit || 0);

  // Net Income YTD (Revenue - Expenses)
  const incomeAccounts = await prisma.erpChartOfAccounts.findMany({ where: { type: 'revenue' } });
  const expenseAccounts = await prisma.erpChartOfAccounts.findMany({ where: { type: 'expense' } });
  
  const incomeLines = await prisma.erpJournalLine.aggregate({
    where: { accountId: { in: incomeAccounts.map(a => a.id) }, entry: { entryDate: { gte: currentYearStart } } },
    _sum: { credit: true, debit: true }
  });
  const expenseLines = await prisma.erpJournalLine.aggregate({
    where: { accountId: { in: expenseAccounts.map(a => a.id) }, entry: { entryDate: { gte: currentYearStart } } },
    _sum: { debit: true, credit: true }
  });
  
  const revenueYTD = Number(incomeLines._sum.credit || 0) - Number(incomeLines._sum.debit || 0);
  const expensesYTD = Number(expenseLines._sum.debit || 0) - Number(expenseLines._sum.credit || 0);
  const netIncomeYTD = revenueYTD - expensesYTD;

  // Estimated VAT Payable
  const vatLines = await prisma.taxTransaction.aggregate({
    _sum: { taxAmount: true }
  });
  const vatPayable = Number(vatLines._sum.taxAmount || 0);

  return ok({
    metrics: {
      totalAssets,
      totalLiabilities,
      netIncomeYTD,
      vatPayable
    }
  });
}

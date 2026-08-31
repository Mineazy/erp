import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok, badRequest } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    const now = new Date();
    const periodStart = startDate ? new Date(startDate) : new Date(now.getFullYear(), 0, 1);
    const periodEnd = endDate ? new Date(endDate) : now;

    // Opening equity: all equity account balances before period start
    const equityAccounts = await prisma.erpChartOfAccounts.findMany({ where: { type: 'equity', isActive: true } });
    const equityAccountIds = equityAccounts.map(a => a.id);

    const openingLines = await prisma.erpJournalLine.aggregate({
      where: {
        accountId: { in: equityAccountIds },
        entry: { entryDate: { lt: periodStart } },
      },
      _sum: { debit: true, credit: true },
    });
    const openingEquity = Number(openingLines._sum.credit || 0) - Number(openingLines._sum.debit || 0);

    // Profit for the period (Revenue - Expenses)
    const incomeAccounts = await prisma.erpChartOfAccounts.findMany({ where: { type: 'revenue', isActive: true } });
    const expenseAccounts = await prisma.erpChartOfAccounts.findMany({ where: { type: 'expense', isActive: true } });

    const revenueLines = await prisma.erpJournalLine.aggregate({
      where: { accountId: { in: incomeAccounts.map(a => a.id) }, entry: { entryDate: { gte: periodStart, lte: periodEnd } } },
      _sum: { credit: true, debit: true },
    });
    const expenseLines = await prisma.erpJournalLine.aggregate({
      where: { accountId: { in: expenseAccounts.map(a => a.id) }, entry: { entryDate: { gte: periodStart, lte: periodEnd } } },
      _sum: { debit: true, credit: true },
    });
    const revenue = Number(revenueLines._sum.credit || 0) - Number(revenueLines._sum.debit || 0);
    const expenses = Number(expenseLines._sum.debit || 0) - Number(expenseLines._sum.credit || 0);
    const profitForPeriod = revenue - expenses;

    // Dividends / drawings from equity accounts (debit entries on equity during period)
    const equityPeriodLines = await prisma.erpJournalLine.aggregate({
      where: {
        accountId: { in: equityAccountIds },
        entry: { entryDate: { gte: periodStart, lte: periodEnd } },
      },
      _sum: { debit: true, credit: true },
    });
    const equityDebits = Number(equityPeriodLines._sum.debit || 0);
    const equityCredits = Number(equityPeriodLines._sum.credit || 0);

    // Dividends = debit entries on equity that aren't from closing entries
    const dividends = equityDebits;

    // Other equity movements = net of equity entries excluding profit/dividends
    const otherChanges = equityCredits - profitForPeriod;

    const closingEquity = openingEquity + profitForPeriod - dividends + otherChanges;

    const data = {
      openingEquity: Math.round(openingEquity * 100) / 100,
      profitForPeriod: Math.round(profitForPeriod * 100) / 100,
      dividends: Math.round(dividends * 100) / 100,
      otherChanges: otherChanges !== 0 ? [
        { description: 'Other equity movements', amount: Math.round(otherChanges * 100) / 100 },
      ] : [],
      closingEquity: Math.round(closingEquity * 100) / 100,
      period: startDate && endDate ? `${startDate} to ${endDate}` : `${periodStart.toISOString().slice(0, 10)} to ${periodEnd.toISOString().slice(0, 10)}`,
    };

    return ok(data);
  } catch (error) {
    console.error('Failed to fetch statement of changes in equity', error);
    return badRequest('Failed to fetch statement of changes in equity');
  }
}

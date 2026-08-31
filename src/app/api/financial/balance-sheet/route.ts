import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok, badRequest } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  try {
    const asAtDate = date ? new Date(date) : new Date();

    // Assets
    const assetAccounts = await prisma.erpChartOfAccounts.findMany({ where: { type: 'asset', isActive: true } });
    const assetLines = await prisma.erpJournalLine.aggregate({
      where: {
        accountId: { in: assetAccounts.map(a => a.id) },
        entry: { entryDate: { lte: asAtDate } },
      },
      _sum: { debit: true, credit: true },
    });
    const totalAssets = Number(assetLines._sum.debit || 0) - Number(assetLines._sum.credit || 0);

    // Liabilities
    const liabilityAccounts = await prisma.erpChartOfAccounts.findMany({ where: { type: 'liability', isActive: true } });
    const liabilityLines = await prisma.erpJournalLine.aggregate({
      where: {
        accountId: { in: liabilityAccounts.map(a => a.id) },
        entry: { entryDate: { lte: asAtDate } },
      },
      _sum: { debit: true, credit: true },
    });
    const totalLiabilities = Number(liabilityLines._sum.credit || 0) - Number(liabilityLines._sum.debit || 0);

    // Equity (from equity accounts + accumulated retained earnings)
    const equityAccounts = await prisma.erpChartOfAccounts.findMany({ where: { type: 'equity', isActive: true } });
    const equityLines = await prisma.erpJournalLine.aggregate({
      where: {
        accountId: { in: equityAccounts.map(a => a.id) },
        entry: { entryDate: { lte: asAtDate } },
      },
      _sum: { debit: true, credit: true },
    });
    const equityFromAccounts = Number(equityLines._sum.credit || 0) - Number(equityLines._sum.debit || 0);

    // Net Income YTD (up to asAtDate) for retained earnings
    const yearStart = new Date(asAtDate.getFullYear(), 0, 1);
    const incomeAccounts = await prisma.erpChartOfAccounts.findMany({ where: { type: 'revenue', isActive: true } });
    const expenseAccounts = await prisma.erpChartOfAccounts.findMany({ where: { type: 'expense', isActive: true } });

    const revenueLines = await prisma.erpJournalLine.aggregate({
      where: { accountId: { in: incomeAccounts.map(a => a.id) }, entry: { entryDate: { gte: yearStart, lte: asAtDate } } },
      _sum: { credit: true, debit: true },
    });
    const expenseLines = await prisma.erpJournalLine.aggregate({
      where: { accountId: { in: expenseAccounts.map(a => a.id) }, entry: { entryDate: { gte: yearStart, lte: asAtDate } } },
      _sum: { debit: true, credit: true },
    });
    const netIncomeYTD = (Number(revenueLines._sum.credit || 0) - Number(revenueLines._sum.debit || 0)) - (Number(expenseLines._sum.debit || 0) - Number(expenseLines._sum.credit || 0));

    const retainedEarnings = equityFromAccounts + netIncomeYTD;

    // Sub-categorize by account category
    const assetByCategory = assetAccounts.reduce((acc: Record<string, number>, a) => {
      const cat = a.category || 'other';
      acc[cat] = (acc[cat] || 0) + 0;
      return acc;
    }, {});

    // Build per-account breakdowns for assets
    const assetBreakdown = await prisma.erpJournalLine.groupBy({
      by: ['accountId'],
      where: { accountId: { in: assetAccounts.map(a => a.id) }, entry: { entryDate: { lte: asAtDate } } },
      _sum: { debit: true, credit: true },
    });
    const assetAccountMap = new Map(assetAccounts.map(a => [a.id, a]));
    let currentAssets = 0;
    let fixedAssets = 0;
    for (const line of assetBreakdown) {
      const acct = assetAccountMap.get(line.accountId);
      const balance = Number(line._sum.debit || 0) - Number(line._sum.credit || 0);
      const cat = acct?.category?.toLowerCase() || '';
      if (cat.includes('fixed') || cat.includes('non-current') || cat.includes('property') || cat.includes('equipment') || cat.includes('vehicle')) {
        fixedAssets += balance;
      } else {
        currentAssets += balance;
      }
    }

    // Liability breakdown
    const liabilityBreakdown = await prisma.erpJournalLine.groupBy({
      by: ['accountId'],
      where: { accountId: { in: liabilityAccounts.map(a => a.id) }, entry: { entryDate: { lte: asAtDate } } },
      _sum: { debit: true, credit: true },
    });
    const liabilityAccountMap = new Map(liabilityAccounts.map(a => [a.id, a]));
    let currentLiabilities = 0;
    let longTermLiabilities = 0;
    for (const line of liabilityBreakdown) {
      const acct = liabilityAccountMap.get(line.accountId);
      const balance = Number(line._sum.credit || 0) - Number(line._sum.debit || 0);
      const cat = acct?.category?.toLowerCase() || '';
      if (cat.includes('long-term') || cat.includes('non-current') || cat.includes('loan') || cat.includes('deferred')) {
        longTermLiabilities += balance;
      } else {
        currentLiabilities += balance;
      }
    }

    const data = {
      assets: {
        current: Math.round(currentAssets * 100) / 100,
        fixed: Math.round(fixedAssets * 100) / 100,
        other: Math.round((totalAssets - currentAssets - fixedAssets) * 100) / 100,
        total: Math.round(totalAssets * 100) / 100,
      },
      liabilities: {
        current: Math.round(currentLiabilities * 100) / 100,
        longTerm: Math.round(longTermLiabilities * 100) / 100,
        other: Math.round((totalLiabilities - currentLiabilities - longTermLiabilities) * 100) / 100,
        total: Math.round(totalLiabilities * 100) / 100,
      },
      equity: {
        share: equityFromAccounts,
        retained: Math.round(retainedEarnings * 100) / 100,
        other: 0,
        total: Math.round((equityFromAccounts + netIncomeYTD) * 100) / 100,
      },
      balanceCheck: {
        totalAssets: Math.round(totalAssets * 100) / 100,
        totalLiabilitiesAndEquity: Math.round((totalLiabilities + equityFromAccounts + netIncomeYTD) * 100) / 100,
      },
      period: date || 'Current Period',
    };

    return ok(data);
  } catch (error) {
    console.error('Failed to fetch balance sheet', error);
    return badRequest('Failed to fetch balance sheet');
  }
}

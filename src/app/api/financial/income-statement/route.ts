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

    // Revenue accounts
    const revenueAccounts = await prisma.erpChartOfAccounts.findMany({ where: { type: 'revenue', isActive: true } });
    const revenueLines = await prisma.erpJournalLine.aggregate({
      where: {
        accountId: { in: revenueAccounts.map(a => a.id) },
        entry: { entryDate: { gte: periodStart, lte: periodEnd } },
      },
      _sum: { debit: true, credit: true },
    });
    const totalRevenue = Number(revenueLines._sum.credit || 0) - Number(revenueLines._sum.debit || 0);

    // Expense accounts
    const expenseAccounts = await prisma.erpChartOfAccounts.findMany({ where: { type: 'expense', isActive: true } });

    // Group expenses by category for COGS vs Operating
    const expenseBreakdown = await prisma.erpJournalLine.groupBy({
      by: ['accountId'],
      where: {
        accountId: { in: expenseAccounts.map(a => a.id) },
        entry: { entryDate: { gte: periodStart, lte: periodEnd } },
      },
      _sum: { debit: true, credit: true },
    });

    const expenseAccountMap = new Map(expenseAccounts.map(a => [a.id, a]));
    let costOfGoodsSold = 0;
    let operatingExpenses = 0;
    let financeCharges = 0;

    for (const line of expenseBreakdown) {
      const acct = expenseAccountMap.get(line.accountId);
      const balance = Number(line._sum.debit || 0) - Number(line._sum.debit || 0) + (Number(line._sum.debit || 0) - Number(line._sum.credit || 0));
      const actualBalance = Number(line._sum.debit || 0) - Number(line._sum.credit || 0);
      const cat = (acct?.category || acct?.name || '').toLowerCase();

      if (cat.includes('cost of') || cat.includes('cogs') || cat.includes('goods sold') || cat.includes('cost of sales')) {
        costOfGoodsSold += actualBalance;
      } else if (cat.includes('finance') || cat.includes('interest') || cat.includes('bank charges')) {
        financeCharges += actualBalance;
      } else {
        operatingExpenses += actualBalance;
      }
    }

    // Other income (income accounts that aren't main revenue - e.g. interest income, gains)
    const otherIncomeAccounts = expenseAccounts.filter(a => {
      const cat = (a.category || a.name || '').toLowerCase();
      return cat.includes('other income') || cat.includes('gain') || cat.includes('interest income');
    });
    const otherIncomeLines = await prisma.erpJournalLine.aggregate({
      where: {
        accountId: { in: otherIncomeAccounts.map(a => a.id) },
        entry: { entryDate: { gte: periodStart, lte: periodEnd } },
      },
      _sum: { debit: true, credit: true },
    });
    const otherIncome = Number(otherIncomeLines._sum.credit || 0) - Number(otherIncomeLines._sum.debit || 0);

    // Tax from tax_transactions
    const taxAgg = await prisma.taxTransaction.aggregate({
      where: { createdAt: { gte: periodStart, lte: periodEnd } },
      _sum: { taxAmount: true },
    });
    const taxExpense = Number(taxAgg._sum.taxAmount || 0);

    const grossProfit = totalRevenue - costOfGoodsSold;
    const operatingProfit = grossProfit - operatingExpenses;
    const profitBeforeTax = operatingProfit + otherIncome - financeCharges;
    const netProfit = profitBeforeTax - taxExpense;

    const data = {
      revenue: Math.round(totalRevenue * 100) / 100,
      costOfGoodsSold: Math.round(costOfGoodsSold * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      grossMargin: totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 10000) / 100 : 0,
      operatingExpenses: Math.round(operatingExpenses * 100) / 100,
      operatingProfit: Math.round(operatingProfit * 100) / 100,
      otherIncome: Math.round(otherIncome * 100) / 100,
      financeCharges: Math.round(financeCharges * 100) / 100,
      profitBeforeTax: Math.round(profitBeforeTax * 100) / 100,
      taxExpense: Math.round(taxExpense * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      netMargin: totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 10000) / 100 : 0,
      period: startDate && endDate ? `${startDate} to ${endDate}` : `${periodStart.toISOString().slice(0, 10)} to ${periodEnd.toISOString().slice(0, 10)}`,
    };

    return ok(data);
  } catch (error) {
    console.error('Failed to fetch income statement', error);
    return badRequest('Failed to fetch income statement');
  }
}

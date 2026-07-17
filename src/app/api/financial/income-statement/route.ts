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
    // TODO: Implement income statement calculation from ledger entries
    // This will aggregate revenue, expenses, and calculate net profit

    const data = {
      revenue: 0,
      costOfGoodsSold: 0,
      grossProfit: 0,
      operatingExpenses: 0,
      operatingProfit: 0,
      otherIncome: 0,
      financeCharges: 0,
      profitBeforeTax: 0,
      taxExpense: 0,
      netProfit: 0,
      period: startDate && endDate ? `${startDate} to ${endDate}` : 'Current Period',
    };

    return ok(data);
  } catch (error) {
    console.error('Failed to fetch income statement', error);
    return badRequest('Failed to fetch income statement');
  }
}

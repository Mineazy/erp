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
    // TODO: Implement statement of changes in equity calculation
    // This will track opening equity, profit, dividends, and closing equity

    const data = {
      openingEquity: 0,
      profitForPeriod: 0,
      dividends: 0,
      otherChanges: [
        // {
        //   description: "Revaluation Reserve",
        //   amount: 0
        // }
      ],
      closingEquity: 0,
      period: startDate && endDate ? `${startDate} to ${endDate}` : 'Current Period',
    };

    return ok(data);
  } catch (error) {
    console.error('Failed to fetch statement of changes in equity', error);
    return badRequest('Failed to fetch statement of changes in equity');
  }
}

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
    // TODO: Implement cashflow statement calculation
    // This will aggregate cash inflows/outflows from transactions

    const data = {
      operatingActivities: 0,
      investingActivities: 0,
      financingActivities: 0,
      netCashFlow: 0,
      openingCashBalance: 0,
      closingCashBalance: 0,
      period: startDate && endDate ? `${startDate} to ${endDate}` : 'Current Period',
    };

    return ok(data);
  } catch (error) {
    console.error('Failed to fetch cashflow statement', error);
    return badRequest('Failed to fetch cashflow statement');
  }
}

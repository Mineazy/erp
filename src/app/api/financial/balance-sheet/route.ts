import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok, badRequest } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  try {
    // TODO: Implement balance sheet calculation from chart of accounts
    // This will aggregate assets, liabilities, and equity balances

    const data = {
      assets: {
        current: 0,
        fixed: 0,
        other: 0,
        total: 0,
      },
      liabilities: {
        current: 0,
        longTerm: 0,
        other: 0,
        total: 0,
      },
      equity: {
        share: 0,
        retained: 0,
        other: 0,
        total: 0,
      },
      period: date || 'Current Period',
    };

    return ok(data);
  } catch (error) {
    console.error('Failed to fetch balance sheet', error);
    return badRequest('Failed to fetch balance sheet');
  }
}

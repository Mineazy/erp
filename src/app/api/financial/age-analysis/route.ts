import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok, badRequest } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const type = searchParams.get('type') || 'both';

  try {
    // TODO: Implement age analysis calculation
    // This will age invoices/bills by days outstanding

    const analysisData = {
      current: 0,
      thirtyDays: 0,
      sixtyDays: 0,
      ninetyDays: 0,
      over90Days: 0,
      total: 0,
      percentage: {
        current: 0,
        thirtyDays: 0,
        sixtyDays: 0,
        ninetyDays: 0,
        over90Days: 0,
      },
    };

    const data = {
      debtors: analysisData,
      creditors: analysisData,
      asAtDate: date || 'Current Period',
    };

    return ok(data);
  } catch (error) {
    console.error('Failed to fetch age analysis', error);
    return badRequest('Failed to fetch age analysis');
  }
}

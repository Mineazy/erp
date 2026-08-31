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

    // Cashbook entries for the period
    const cashbookEntries = await prisma.erpCashbook.findMany({
      where: {
        entryDate: { gte: periodStart, lte: periodEnd },
        status: 'posted',
      },
      orderBy: { entryDate: 'asc' },
    });

    // Classify cashbook entries into operating / investing / financing
    let operatingInflows = 0;
    let operatingOutflows = 0;
    let investingInflows = 0;
    let investingOutflows = 0;
    let financingInflows = 0;
    let financingOutflows = 0;

    for (const entry of cashbookEntries) {
      const amt = Number(entry.amount);
      const desc = (entry.description || '').toLowerCase();
      const type = (entry.type || '').toLowerCase();

      const isInvesting = desc.includes('equipment') || desc.includes('vehicle') || desc.includes('asset') || desc.includes('property') || desc.includes('investment') || type === 'investing';
      const isFinancing = desc.includes('loan') || desc.includes('borrowing') || desc.includes('dividend') || desc.includes('capital') || desc.includes('repayment') || type === 'financing';

      if (isInvesting) {
        if (amt > 0) investingInflows += amt;
        else investingOutflows += Math.abs(amt);
      } else if (isFinancing) {
        if (amt > 0) financingInflows += amt;
        else financingOutflows += Math.abs(amt);
      } else {
        // Default to operating
        if (amt > 0) operatingInflows += amt;
        else operatingOutflows += Math.abs(amt);
      }
    }

    const operatingActivities = operatingInflows - operatingOutflows;
    const investingActivities = investingInflows - investingOutflows;
    const financingActivities = financingInflows - financingOutflows;
    const netCashFlow = operatingActivities + investingActivities + financingActivities;

    // Opening cash balance: all cashbook entries before period start
    const priorEntries = await prisma.erpCashbook.findMany({
      where: { entryDate: { lt: periodStart }, status: 'posted' },
    });
    const openingCashBalance = priorEntries.reduce((sum, e) => sum + Number(e.amount), 0);
    const closingCashBalance = openingCashBalance + netCashFlow;

    const data = {
      operatingActivities: Math.round(operatingActivities * 100) / 100,
      operatingBreakdown: {
        inflows: Math.round(operatingInflows * 100) / 100,
        outflows: Math.round(operatingOutflows * 100) / 100,
      },
      investingActivities: Math.round(investingActivities * 100) / 100,
      investingBreakdown: {
        inflows: Math.round(investingInflows * 100) / 100,
        outflows: Math.round(investingOutflows * 100) / 100,
      },
      financingActivities: Math.round(financingActivities * 100) / 100,
      financingBreakdown: {
        inflows: Math.round(financingInflows * 100) / 100,
        outflows: Math.round(financingOutflows * 100) / 100,
      },
      netCashFlow: Math.round(netCashFlow * 100) / 100,
      openingCashBalance: Math.round(openingCashBalance * 100) / 100,
      closingCashBalance: Math.round(closingCashBalance * 100) / 100,
      period: startDate && endDate ? `${startDate} to ${endDate}` : `${periodStart.toISOString().slice(0, 10)} to ${periodEnd.toISOString().slice(0, 10)}`,
    };

    return ok(data);
  } catch (error) {
    console.error('Failed to fetch cashflow statement', error);
    return badRequest('Failed to fetch cashflow statement');
  }
}

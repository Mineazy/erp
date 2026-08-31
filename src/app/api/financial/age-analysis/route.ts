import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok, badRequest } from '@/lib/api';

function ageBuckets(invoices: { balance: any; dueDate: Date }[], asAtDate: Date) {
  let current = 0;
  let thirtyDays = 0;
  let sixtyDays = 0;
  let ninetyDays = 0;
  let over90Days = 0;

  for (const inv of invoices) {
    const bal = Number(inv.balance);
    if (bal <= 0) continue;

    const daysOverdue = Math.floor((asAtDate.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));

    if (daysOverdue <= 0) {
      current += bal;
    } else if (daysOverdue <= 30) {
      thirtyDays += bal;
    } else if (daysOverdue <= 60) {
      sixtyDays += bal;
    } else if (daysOverdue <= 90) {
      ninetyDays += bal;
    } else {
      over90Days += bal;
    }
  }

  const total = current + thirtyDays + sixtyDays + ninetyDays + over90Days;

  return {
    current: Math.round(current * 100) / 100,
    thirtyDays: Math.round(thirtyDays * 100) / 100,
    sixtyDays: Math.round(sixtyDays * 100) / 100,
    ninetyDays: Math.round(ninetyDays * 100) / 100,
    over90Days: Math.round(over90Days * 100) / 100,
    total: Math.round(total * 100) / 100,
    percentage: {
      current: total > 0 ? Math.round((current / total) * 10000) / 100 : 0,
      thirtyDays: total > 0 ? Math.round((thirtyDays / total) * 10000) / 100 : 0,
      sixtyDays: total > 0 ? Math.round((sixtyDays / total) * 10000) / 100 : 0,
      ninetyDays: total > 0 ? Math.round((ninetyDays / total) * 10000) / 100 : 0,
      over90Days: total > 0 ? Math.round((over90Days / total) * 10000) / 100 : 0,
    },
  };
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const type = searchParams.get('type') || 'both';

  try {
    const asAtDate = date ? new Date(date) : new Date();

    let debtorsAnalysis = null;
    let creditorsAnalysis = null;

    if (type === 'both' || type === 'debtors') {
      const receivables = await prisma.erpAccountReceivable.findMany({
        where: { status: { in: ['pending', 'overdue', 'partial'] } },
      });
      debtorsAnalysis = ageBuckets(receivables, asAtDate);
    }

    if (type === 'both' || type === 'creditors') {
      const payables = await prisma.erpAccountPayable.findMany({
        where: { status: { in: ['pending', 'overdue', 'partial'] } },
      });
      creditorsAnalysis = ageBuckets(payables, asAtDate);
    }

    const data = {
      debtors: debtorsAnalysis || { current: 0, thirtyDays: 0, sixtyDays: 0, ninetyDays: 0, over90Days: 0, total: 0, percentage: { current: 0, thirtyDays: 0, sixtyDays: 0, ninetyDays: 0, over90Days: 0 } },
      creditors: creditorsAnalysis || { current: 0, thirtyDays: 0, sixtyDays: 0, ninetyDays: 0, over90Days: 0, total: 0, percentage: { current: 0, thirtyDays: 0, sixtyDays: 0, ninetyDays: 0, over90Days: 0 } },
      asAtDate: asAtDate.toISOString().slice(0, 10),
    };

    return ok(data);
  } catch (error) {
    console.error('Failed to fetch age analysis', error);
    return badRequest('Failed to fetch age analysis');
  }
}

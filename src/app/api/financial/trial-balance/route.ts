import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const accounts = await prisma.erpChartOfAccounts.findMany({
    where: { isActive: true },
    select: { id: true, code: true, name: true, type: true },
    orderBy: { code: 'asc' },
  });

  const lines = await prisma.erpJournalLine.groupBy({
    by: ['accountId'],
    _sum: { debit: true, credit: true },
  });

  const sumMap = new Map(lines.map((l) => [l.accountId, { debit: l._sum.debit || 0, credit: l._sum.credit || 0 }]));

  const trialBalance = accounts.map((a) => {
    const totals = sumMap.get(a.id) || { debit: 0, credit: 0 };
    return {
      ...a,
      totalDebit: totals.debit,
      totalCredit: totals.credit,
    };
  });

  return ok(trialBalance);
}

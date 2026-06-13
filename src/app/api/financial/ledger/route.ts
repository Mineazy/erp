import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');

  const where: any = {};
  if (accountId) where.accountId = accountId;

  const lines = await prisma.erpJournalLine.findMany({
    where,
    include: {
      account: true,
      entry: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  let balance = 0;
  const ledger = lines.map((line) => {
    balance = Number(balance) + Number(line.debit) - Number(line.credit);
    return {
      id: line.id,
      date: line.entry.entryDate,
      entryNumber: line.entry.entryNumber,
      description: line.description || line.entry.description,
      account: line.account,
      debit: line.debit,
      credit: line.credit,
      balance,
    };
  });

  return ok(ledger);
}

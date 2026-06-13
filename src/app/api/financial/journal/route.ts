import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, created, getBody, getNextSequence } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status');
  const period = searchParams.get('period');

  const where: any = {};
  if (search) {
    where.OR = [
      { description: { contains: search } },
      { entryNumber: { contains: search } },
    ];
  }
  if (status) where.status = status;
  if (period) where.period = period;

  const entries = await prisma.erpJournalEntry.findMany({
    where,
    include: {
      lines: { include: { account: true } },
    },
    orderBy: { entryDate: 'desc' },
  });
  return ok(entries);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { description, entryDate, period } = body;
  const lines = body.lines as any[];

  if (!description || !lines?.length) return badRequest('Description and line items required');

  let totalDebit = 0, totalCredit = 0;
  const lineData = lines.map((l: any) => {
    const d = parseFloat(l.debit || '0');
    const c = parseFloat(l.credit || '0');
    totalDebit += d;
    totalCredit += c;
    return { accountId: l.accountId, description: l.description, debit: d, credit: c };
  });

  if (Math.abs(totalDebit - totalCredit) > 0.01) return badRequest('Debits must equal credits');

  const entryNumber = await getNextSequence(prisma, 'erpJournalEntry', 'entryNumber', 'JE');

  const entry = await prisma.erpJournalEntry.create({
    data: {
      entryNumber,
      description: description as string,
      entryDate: new Date(entryDate as string),
      period: period as string,
      lines: { create: lineData },
    },
    include: { lines: { include: { account: true } } },
  });
  return created(entry);
}

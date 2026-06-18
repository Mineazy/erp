import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, badRequest, ok, getBody } from '@/lib/api';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const entry = await prisma.erpJournalEntry.findUnique({
    where: { id: id },
    include: { lines: { include: { account: true } } },
  });
  if (!entry) return notFound('Journal entry not found');
  return ok(entry);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpJournalEntry.findUnique({
    where: { id: id },
    include: { lines: true },
  });
  if (!existing) return notFound('Journal entry not found');
  if (existing.status === 'posted') return badRequest('Cannot edit a posted entry');

  const body = await getBody(request);
  const { description, entryDate, period } = body;
  const lines = body.lines as any[];

  if (!description || !lines?.length) return badRequest('Description and line items required');

  let totalDebit = 0, totalCredit = 0;
  const lineData = (lines as any[]).map((l: any) => {
    const d = parseFloat(l.debit || '0');
    const c = parseFloat(l.credit || '0');
    totalDebit += d;
    totalCredit += c;
    return { accountId: l.accountId, description: l.description, debit: d, credit: c };
  });

  if (Math.abs(totalDebit - totalCredit) > 0.01) return badRequest('Debits must equal credits');

  await prisma.erpJournalLine.deleteMany({ where: { entryId: id } });

  const entry = await prisma.erpJournalEntry.update({
    where: { id: id },
    data: {
      description: description as string,
      entryDate: new Date(entryDate as string),
      period: period as string,
      lines: { create: lineData },
    },
    include: { lines: { include: { account: true } } },
  });
  return ok(entry);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpJournalEntry.findUnique({ where: { id: id } });
  if (!existing) return notFound('Journal entry not found');
  if (existing.status === 'posted') return badRequest('Cannot delete a posted entry');

  await prisma.erpJournalEntry.delete({ where: { id: id } });
  return ok({ deleted: true });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpJournalEntry.findUnique({ where: { id: id } });
  if (!existing) return notFound('Journal entry not found');
  if (existing.status === 'posted') return badRequest('Entry is already posted');

  const user = session.user as { name?: string };
  const entry = await prisma.erpJournalEntry.update({
    where: { id: id },
    data: {
      status: 'posted',
      postedAt: new Date(),
      postedBy: user.name || session.user?.email || 'unknown',
    },
    include: { lines: { include: { account: true } } },
  });
  return ok(entry);
}

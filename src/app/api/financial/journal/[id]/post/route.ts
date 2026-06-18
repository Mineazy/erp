import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok } from '@/lib/api';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const entry = await prisma.erpJournalEntry.findUnique({ where: { id: id } });
  if (!entry) return notFound('Journal entry not found');

  const updated = await prisma.erpJournalEntry.update({
    where: { id: id },
    data: { status: 'posted', postedAt: new Date(), postedBy: (session.user as any).email || 'unknown' },
  });

  return ok(updated);
}

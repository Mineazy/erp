import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, badRequest, ok } from '@/lib/api';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const quote = await prisma.erpQuotation.findUnique({ where: { id }, include: { lines: true } });
  if (!quote) return notFound('Quotation not found');

  if (quote.status !== 'draft') return badRequest('Only draft quotations can be sent');

  const updated = await prisma.erpQuotation.update({
    where: { id },
    data: { status: 'sent' },
    include: { lines: true },
  });

  return ok({
    message: 'Quotation marked as sent',
    quote: updated,
  });
}

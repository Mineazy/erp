import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok } from '@/lib/api';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const quote = await prisma.erpQuotation.findUnique({
    where: { id },
    include: { lines: true },
  });

  if (!quote) return notFound('Quotation not found');

  const branch = quote.branchId
    ? await prisma.erpBranch.findUnique({ where: { id: quote.branchId }, select: { name: true, address: true, phone: true, email: true } })
    : null;

  const user = quote.createdBy
    ? await prisma.erpUser.findFirst({ where: { name: quote.createdBy }, select: { name: true } })
    : null;

  const document = {
    title: 'QUOTATION',
    quoteNumber: quote.quoteNumber,
    quoteDate: quote.quoteDate.toISOString(),
    validUntil: quote.validUntil?.toISOString() || null,
    customerName: quote.customerName,
    customerEmail: quote.customerEmail || '',
    branch: branch?.name || '',
    branchAddress: branch?.address || '',
    branchPhone: branch?.phone || '',
    branchEmail: branch?.email || '',
    subtotal: Number(quote.subtotal),
    taxAmount: Number(quote.taxAmount),
    discount: Number(quote.discount),
    total: Number(quote.total),
    currency: quote.currency,
    notes: quote.notes || '',
    terms: quote.terms || '',
    createdBy: user?.name || quote.createdBy || '',
    lines: quote.lines.map((l) => ({
      productName: l.productName,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
      total: Number(l.total),
    })),
    generatedAt: new Date().toISOString(),
  };

  return ok(document);
}

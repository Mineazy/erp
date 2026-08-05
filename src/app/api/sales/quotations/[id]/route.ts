import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, badRequest } from '@/lib/api';

export async function GET(
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
  return ok(quote);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpQuotation.findUnique({ where: { id } });
  if (!existing) return notFound('Quotation not found');
  if (existing.status !== 'draft') return badRequest('Only draft quotations can be edited');

  const body = await request.json();
  const { customerName, customerEmail, quoteDate, validUntil, notes, terms, taxAmount, discount, lines } = body;

  if (lines && Array.isArray(lines) && lines.length > 0) {
    await prisma.erpQuotationLine.deleteMany({ where: { quoteId: id } });

    let subtotal = 0;
    for (const line of lines as any[]) {
      const total = parseFloat(line.quantity) * parseFloat(line.unitPrice);
      subtotal += total;
      await prisma.erpQuotationLine.create({
        data: {
          quoteId: id,
          productId: line.productId,
          productName: line.productName,
          quantity: parseFloat(line.quantity),
          unitPrice: parseFloat(line.unitPrice),
          total,
        },
      });
    }

    const tx = parseFloat((taxAmount as string) || '0');
    const disc = parseFloat((discount as string) || '0');
    const total = subtotal + tx - disc;

    const updated = await prisma.erpQuotation.update({
      where: { id },
      data: {
        customerName: customerName as string,
        customerEmail: customerEmail as string || null,
        quoteDate: quoteDate ? new Date(quoteDate as string) : undefined,
        validUntil: validUntil ? new Date(validUntil as string) : null,
        subtotal,
        taxAmount: tx,
        discount: disc,
        total,
        notes: notes as string || null,
        terms: terms as string || null,
      },
      include: { lines: true },
    });

    return ok(updated);
  }

  const updated = await prisma.erpQuotation.update({
    where: { id },
    data: {
      customerName: customerName !== undefined ? (customerName as string) : undefined,
      customerEmail: customerEmail !== undefined ? (customerEmail as string || null) : undefined,
      validUntil: validUntil !== undefined ? (validUntil ? new Date(validUntil as string) : null) : undefined,
      notes: notes !== undefined ? (notes as string || null) : undefined,
      terms: terms !== undefined ? (terms as string || null) : undefined,
    },
    include: { lines: true },
  });

  return ok(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpQuotation.findUnique({ where: { id } });
  if (!existing) return notFound('Quotation not found');

  await prisma.erpQuotation.delete({ where: { id } });
  return ok({ success: true });
}

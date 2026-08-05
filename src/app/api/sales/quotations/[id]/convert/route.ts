import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, badRequest, created, getNextSequence } from '@/lib/api';

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
  if (quote.status === 'draft') return badRequest('Send the quotation before converting');
  if (quote.status === 'converted') return badRequest('Already converted to a sales order');
  if (quote.status === 'rejected') return badRequest('Cannot convert a rejected quotation');

  const orderNumber = await getNextSequence(prisma, 'erpSalesOrder', 'orderNumber', 'SO');

  const salesOrder = await prisma.erpSalesOrder.create({
    data: {
      orderNumber,
      customerId: quote.customerId,
      customerName: quote.customerName,
      orderDate: new Date(),
      status: 'draft',
      subtotal: quote.subtotal,
      taxAmount: quote.taxAmount,
      discount: quote.discount,
      total: quote.total,
      currency: quote.currency,
      exchangeRate: quote.exchangeRate,
      notes: quote.notes,
      branchId: quote.branchId,
      lines: {
        create: quote.lines.map((l) => ({
          productId: l.productId,
          productName: l.productName,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          total: l.total,
        })),
      },
    },
    include: { lines: true },
  });

  await prisma.erpQuotation.update({
    where: { id },
    data: { status: 'converted', convertedToId: salesOrder.id },
  });

  return created({
    message: 'Quotation converted to sales order',
    salesOrder,
  });
}

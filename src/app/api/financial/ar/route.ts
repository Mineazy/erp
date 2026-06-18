import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, created, getBody, getNextSequence } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customerId');
  const status = searchParams.get('status');

  const where: any = {};
  if (customerId) where.customerId = customerId;
  if (status) where.status = status;

  const items = await prisma.erpAccountReceivable.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return ok(items);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { customerId, customerName, invoiceDate, dueDate, amount, currency, description } = body;

  if (!customerName || amount === undefined || amount === null) return badRequest('Customer name and amount are required');

  const invoiceNumber = await getNextSequence(prisma, 'erpAccountReceivable', 'invoiceNumber', 'INV');
  const finalCustomerId = (customerId as string) || `CUST-${(customerName as string).replace(/[^a-zA-Z0-9]/g, '-').toUpperCase().replace(/-+/g, '-').replace(/^-|-$/g, '')}`;

  const item = await prisma.erpAccountReceivable.create({
    data: {
      invoiceNumber,
      customerId: finalCustomerId,
      customerName: customerName as string,
      invoiceDate: new Date(invoiceDate as string),
      dueDate: new Date(dueDate as string),
      amount: parseFloat(amount as string),
      balance: parseFloat(amount as string),
      currency: (currency as string) || 'USD',
      description: description as string,
    },
  });
  return created(item);
}

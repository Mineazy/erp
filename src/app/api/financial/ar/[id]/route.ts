import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody } from '@/lib/api';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const item = await prisma.erpAccountReceivable.findUnique({ where: { id: params.id } });
  if (!item) return notFound('AR record not found');
  return ok(item);
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpAccountReceivable.findUnique({ where: { id: params.id } });
  if (!existing) return notFound('AR record not found');

  const body = await getBody(request);
  const { customerId, customerName, invoiceDate, dueDate, amount, paidAmount, balance, status, currency, description } = body;

  const data: Record<string, unknown> = {};
  if (customerId) data.customerId = customerId as string;
  if (customerName) data.customerName = customerName as string;
  if (invoiceDate) data.invoiceDate = new Date(invoiceDate as string);
  if (dueDate) data.dueDate = new Date(dueDate as string);
  if (amount !== undefined) data.amount = parseFloat(amount as string);
  if (paidAmount !== undefined) data.paidAmount = parseFloat(paidAmount as string);
  if (balance !== undefined) data.balance = parseFloat(balance as string);
  if (status) data.status = status as string;
  data.currency = currency as string;
  data.description = description as string;

  const item = await prisma.erpAccountReceivable.update({
    where: { id: params.id },
    data: data as any,
  });
  return ok(item);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpAccountReceivable.findUnique({ where: { id: params.id } });
  if (!existing) return notFound('AR record not found');

  await prisma.erpAccountReceivable.delete({ where: { id: params.id } });
  return ok({ deleted: true });
}

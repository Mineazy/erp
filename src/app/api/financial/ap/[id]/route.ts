import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody } from '@/lib/api';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const item = await prisma.erpAccountPayable.findUnique({ where: { id: id } });
  if (!item) return notFound('AP record not found');
  return ok(item);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpAccountPayable.findUnique({ where: { id: id } });
  if (!existing) return notFound('AP record not found');

  const body = await getBody(request);
  const { supplierId, supplierName, billDate, dueDate, amount, paidAmount, balance, status, currency, description } = body;

  const data: Record<string, unknown> = {};
  if (supplierId) data.supplierId = supplierId as string;
  if (supplierName) data.supplierName = supplierName as string;
  if (billDate) data.billDate = new Date(billDate as string);
  if (dueDate) data.dueDate = new Date(dueDate as string);
  if (amount !== undefined) data.amount = parseFloat(amount as string);
  if (paidAmount !== undefined) data.paidAmount = parseFloat(paidAmount as string);
  if (balance !== undefined) data.balance = parseFloat(balance as string);
  if (status) data.status = status as string;
  data.currency = currency as string;
  data.description = description as string;

  const item = await prisma.erpAccountPayable.update({
    where: { id: id },
    data: data as any,
  });
  return ok(item);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpAccountPayable.findUnique({ where: { id: id } });
  if (!existing) return notFound('AP record not found');

  await prisma.erpAccountPayable.delete({ where: { id: id } });
  return ok({ deleted: true });
}

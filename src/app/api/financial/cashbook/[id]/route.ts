import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody } from '@/lib/api';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const item = await prisma.erpCashbook.findUnique({ where: { id: id } });
  if (!item) return notFound('Cashbook entry not found');
  return ok(item);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpCashbook.findUnique({ where: { id: id } });
  if (!existing) return notFound('Cashbook entry not found');

  const body = await getBody(request);
  const { entryDate, type, accountId, description, amount, currency, reference, status } = body;

  const data: Record<string, unknown> = {};
  if (type) data.type = type as string;
  if (accountId) data.accountId = accountId as string;
  if (description) data.description = description as string;
  if (entryDate) data.entryDate = new Date(entryDate as string);
  if (amount !== undefined) data.amount = parseFloat(amount as string);
  data.currency = currency as string;
  data.reference = reference as string;
  if (status) data.status = status as string;

  const item = await prisma.erpCashbook.update({
    where: { id: id },
    data: data as any,
  });
  return ok(item);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpCashbook.findUnique({ where: { id: id } });
  if (!existing) return notFound('Cashbook entry not found');

  await prisma.erpCashbook.delete({ where: { id: id } });
  return ok({ deleted: true });
}

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody } from '@/lib/api';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const account = await prisma.erpChartOfAccounts.findUnique({
    where: { id: id },
    include: { parent: true, children: true },
  });
  if (!account) return notFound('Account not found');
  return ok(account);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpChartOfAccounts.findUnique({ where: { id: id } });
  if (!existing) return notFound('Account not found');

  const body = await getBody(request);
  const { name, type, category, isHeader, parentId, isActive, currency } = body;

  const data: Record<string, unknown> = {};
  if (name) data.name = name as string;
  if (type) data.type = type as string;
  if (category !== undefined) data.category = category;
  if (isHeader !== undefined) data.isHeader = Boolean(isHeader);
  if (parentId !== undefined) data.parentId = parentId || null;
  if (isActive !== undefined) data.isActive = Boolean(isActive);
  if (currency !== undefined) data.currency = currency;

  const account = await prisma.erpChartOfAccounts.update({
    where: { id: id },
    data: data as any,
  });
  return ok(account);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpChartOfAccounts.findUnique({ where: { id: id } });
  if (!existing) return notFound('Account not found');

  await prisma.erpChartOfAccounts.delete({ where: { id: id } });
  return ok({ deleted: true });
}

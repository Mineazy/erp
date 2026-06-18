import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody } from '@/lib/api';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const item = await prisma.erpSupplierContract.findUnique({
    where: { id: id },
    include: { supplier: true },
  });
  if (!item) return notFound('Contract not found');
  return ok(item);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpSupplierContract.findUnique({ where: { id: id } });
  if (!existing) return notFound('Contract not found');

  const body = await getBody(request);
  const { supplierId, contractNo, title, startDate, endDate, value, currency, status, terms, docUrl } = body;

  const data: Record<string, unknown> = {};
  if (supplierId) data.supplierId = supplierId as string;
  if (contractNo) data.contractNo = contractNo as string;
  if (title) data.title = title as string;
  if (startDate) data.startDate = new Date(startDate as string);
  if (endDate) data.endDate = new Date(endDate as string);
  if (value !== undefined) data.value = parseFloat(value as string);
  if (currency) data.currency = currency as string;
  if (status) data.status = status as string;
  if (terms !== undefined) data.terms = terms;
  if (docUrl !== undefined) data.docUrl = docUrl;

  const item = await prisma.erpSupplierContract.update({
    where: { id: id },
    data: data as any,
    include: { supplier: true },
  });
  return ok(item);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpSupplierContract.findUnique({ where: { id: id } });
  if (!existing) return notFound('Contract not found');

  await prisma.erpSupplierContract.delete({ where: { id: id } });
  return ok({ deleted: true });
}

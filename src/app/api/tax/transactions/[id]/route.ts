import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody } from '@/lib/api';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const item = await prisma.taxTransaction.findUnique({
    where: { id: id },
    include: { taxType: true },
  });
  if (!item) return notFound('Tax transaction not found');
  return ok(item);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.taxTransaction.findUnique({ where: { id: id } });
  if (!existing) return notFound('Tax transaction not found');

  const body = await getBody(request);
  const { reference, referenceType, taxTypeId, taxableAmount, rate, currency, exchangeRate, postedToTaRMS } = body;

  const data: Record<string, unknown> = {};
  if (reference) data.reference = reference as string;
  if (referenceType) data.referenceType = referenceType as string;
  if (taxTypeId) data.taxTypeId = taxTypeId as string;
  if (taxableAmount) data.taxableAmount = parseFloat(taxableAmount as string);
  if (rate) data.rate = parseFloat(rate as string);
  if (currency) data.currency = currency as string;
  if (exchangeRate) data.exchangeRate = parseFloat(exchangeRate as string);
  if (postedToTaRMS !== undefined) data.postedToTaRMS = Boolean(postedToTaRMS);
  if (rate && taxableAmount) data.taxAmount = (parseFloat(taxableAmount as string) * parseFloat(rate as string)) / 100;

  const item = await prisma.taxTransaction.update({
    where: { id: id },
    data: data as any,
  });
  return ok(item);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.taxTransaction.findUnique({ where: { id: id } });
  if (!existing) return notFound('Tax transaction not found');

  await prisma.taxTransaction.delete({ where: { id: id } });
  return ok({ deleted: true });
}

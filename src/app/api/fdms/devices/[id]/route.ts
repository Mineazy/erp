import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody } from '@/lib/api';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const item = await prisma.fdmsDevice.findUnique({ where: { id: id } });
  if (!item) return notFound('Device not found');
  return ok(item);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.fdmsDevice.findUnique({ where: { id: id } });
  if (!existing) return notFound('Device not found');

  const body = await getBody(request);
  const { serialNo, activationKey, certificate, privateKey, status, fiscalDayNo, receiptCounter, receiptGlobalNo } = body;

  const data: Record<string, unknown> = {};
  if (serialNo) data.serialNo = serialNo as string;
  if (activationKey !== undefined) data.activationKey = activationKey;
  if (certificate !== undefined) data.certificate = certificate;
  if (privateKey !== undefined) data.privateKey = privateKey;
  if (status) data.status = status as string;
  if (fiscalDayNo !== undefined) data.fiscalDayNo = parseInt(fiscalDayNo as string);
  if (receiptCounter !== undefined) data.receiptCounter = parseInt(receiptCounter as string);
  if (receiptGlobalNo !== undefined) data.receiptGlobalNo = parseInt(receiptGlobalNo as string);

  const item = await prisma.fdmsDevice.update({
    where: { id: id },
    data: data as any,
  });
  return ok(item);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.fdmsDevice.findUnique({ where: { id: id } });
  if (!existing) return notFound('Device not found');

  await prisma.fdmsDevice.delete({ where: { id: id } });
  return ok({ deleted: true });
}

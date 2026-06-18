import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody } from '@/lib/api';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const item = await prisma.fiscalisedDocument.findUnique({
    where: { id: id },
    include: { device: true },
  });
  if (!item) return notFound('Document not found');
  return ok(item);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.fiscalisedDocument.findUnique({ where: { id: id } });
  if (!existing) return notFound('Document not found');

  const body = await getBody(request);
  const { documentType, documentRef, deviceId, fiscalDayNo, receiptNo, receiptGlobalNo, authCode, qrCodeData, qrCodeUrl, status, errorMessage, retryCount } = body;

  const data: Record<string, unknown> = {};
  if (documentType) data.documentType = documentType as string;
  if (documentRef) data.documentRef = documentRef as string;
  if (deviceId) data.deviceId = deviceId as string;
  if (fiscalDayNo !== undefined) data.fiscalDayNo = parseInt(fiscalDayNo as string);
  if (receiptNo !== undefined) data.receiptNo = parseInt(receiptNo as string);
  if (receiptGlobalNo !== undefined) data.receiptGlobalNo = parseInt(receiptGlobalNo as string);
  if (authCode !== undefined) data.authCode = authCode;
  if (qrCodeData !== undefined) data.qrCodeData = qrCodeData;
  if (qrCodeUrl !== undefined) data.qrCodeUrl = qrCodeUrl;
  if (status) data.status = status as string;
  if (errorMessage !== undefined) data.errorMessage = errorMessage;
  if (retryCount !== undefined) data.retryCount = parseInt(retryCount as string);

  const item = await prisma.fiscalisedDocument.update({
    where: { id: id },
    data: data as any,
  });
  return ok(item);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.fiscalisedDocument.findUnique({ where: { id: id } });
  if (!existing) return notFound('Document not found');

  await prisma.fiscalisedDocument.delete({ where: { id: id } });
  return ok({ deleted: true });
}

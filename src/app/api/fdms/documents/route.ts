import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, created, ok, getBody } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const deviceId = searchParams.get('deviceId');

  const where: any = {};
  if (status) where.status = status;
  if (deviceId) where.deviceId = deviceId;

  const items = await prisma.fiscalisedDocument.findMany({
    where,
    include: { device: true },
    orderBy: { createdAt: 'desc' },
  });
  return ok(items);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { documentType, documentRef, deviceId, fiscalDayNo, receiptNo, receiptGlobalNo, authCode, qrCodeData, qrCodeUrl, status, errorMessage } = body;
  if (!documentType) return badRequest('Document type is required');
  if (!documentRef) return badRequest('Document reference is required');
  if (!deviceId) return badRequest('Device is required');
  if (fiscalDayNo === undefined) return badRequest('Fiscal day number is required');
  if (receiptNo === undefined) return badRequest('Receipt number is required');

  const item = await prisma.fiscalisedDocument.create({
    data: {
      documentType: documentType as string,
      documentRef: documentRef as string,
      deviceId: deviceId as string,
      fiscalDayNo: parseInt(fiscalDayNo as string),
      receiptNo: parseInt(receiptNo as string),
      receiptGlobalNo: parseInt((receiptGlobalNo as string) || '0'),
      authCode: authCode as string | undefined,
      qrCodeData: qrCodeData as string | undefined,
      qrCodeUrl: qrCodeUrl as string | undefined,
      status: (status as string) || 'pending',
      errorMessage: errorMessage as string | undefined,
    },
  });
  return created(item);
}

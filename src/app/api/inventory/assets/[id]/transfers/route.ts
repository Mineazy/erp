import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody, badRequest, created, getNextSequence } from '@/lib/api';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  // Verify asset exists
  const asset = await prisma.erpAsset.findUnique({ where: { id } });
  if (!asset) return notFound('Asset not found');

  const transfers = await prisma.erpAssetTransfer.findMany({
    where: { assetId: id },
    orderBy: { createdAt: 'desc' },
  });

  return ok(transfers);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  // Verify asset exists
  const asset = await prisma.erpAsset.findUnique({ where: { id } });
  if (!asset) return notFound('Asset not found');

  const body = await getBody(request);
  const { fromLocation, toLocation, transferDate, transferReason, transferredBy, receivedBy, notes } = body;

  if (!fromLocation || !toLocation || !transferDate || !transferredBy) {
    return badRequest('From location, to location, transfer date, and transferred by are required');
  }

  const transferNo = await getNextSequence(prisma, 'erpAssetTransfer', 'transferNo', 'TRN');

  const transfer = await prisma.erpAssetTransfer.create({
    data: {
      transferNo,
      assetId: id,
      fromLocation: fromLocation as string,
      toLocation: toLocation as string,
      transferDate: new Date(transferDate as string),
      transferReason: transferReason as string | undefined,
      transferredBy: transferredBy as string,
      receivedBy: receivedBy as string | undefined,
      notes: notes as string | undefined,
      status: 'pending',
    },
  });

  return created(transfer);
}

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

  const checkouts = await prisma.erpAssetCheckout.findMany({
    where: { assetId: id },
    orderBy: { createdAt: 'desc' },
  });

  return ok(checkouts);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  // Verify asset exists
  const asset = await prisma.erpAsset.findUnique({ where: { id } });
  if (!asset) return notFound('Asset not found');

  const body = await getBody(request);
  const { checkedOutBy, expectedReturn, purpose, condition } = body;

  if (!checkedOutBy) {
    return badRequest('Checked out by is required');
  }

  const checkoutNo = await getNextSequence(prisma, 'erpAssetCheckout', 'checkoutNo', 'CHK');

  const checkout = await prisma.erpAssetCheckout.create({
    data: {
      checkoutNo,
      assetId: id,
      checkedOutBy: checkedOutBy as string,
      expectedReturn: expectedReturn ? new Date(expectedReturn as string) : undefined,
      purpose: purpose as string | undefined,
      condition: (condition as string) || 'good',
      status: 'active',
    },
  });

  return created(checkout);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const body = (await getBody(request)) as any;
  const { checkoutId, checkedInBy, condition, notes } = body;

  if (!checkoutId || !checkedInBy) {
    return badRequest('Checkout ID and checked in by are required');
  }

  const checkout = await prisma.erpAssetCheckout.findUnique({ where: { id: checkoutId } });
  if (!checkout) return notFound('Checkout record not found');

  const updated = await prisma.erpAssetCheckout.update({
    where: { id: checkoutId },
    data: {
      checkedInAt: new Date(),
      checkedInBy: checkedInBy as string,
      condition: condition ? (condition as string) : undefined,
      notes: notes ? (notes as string) : undefined,
      status: 'completed',
    },
  });

  return ok(updated);
}

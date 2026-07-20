import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, badRequest } from '@/lib/api';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const asset = await prisma.erpAsset.findUnique({
    where: { id },
    include: { category: true, depreciations: true },
  });

  if (!asset) return notFound('Asset not found');

  const depreciations = await prisma.erpAssetDepreciation.findMany({
    where: { assetId: id },
    orderBy: { createdAt: 'desc' },
  });

  // Calculate accumulated depreciation
  const accumulated = depreciations.reduce((sum, d) => sum + Number(d.depreciationExp), 0);
  const remainingLife = asset.usefulLifeYears || asset.category?.usefulLife || 0;

  return ok({
    asset,
    depreciations,
    accumulated,
    currentValue: Number(asset.purchaseCost) - accumulated,
    remainingLife,
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const asset = await prisma.erpAsset.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!asset) return notFound('Asset not found');

  const body = await getRequest(request);
  const { period } = body;

  if (!period) {
    return badRequest('Period is required');
  }

  // Calculate depreciation
  const usefulLife = asset.usefulLifeYears || asset.category?.usefulLife || 0;
  if (usefulLife === 0) {
    return badRequest('Asset category must have useful life configured for depreciation calculation');
  }

  const depreciationPerYear = (Number(asset.purchaseCost) - Number(asset.salvageValue)) / usefulLife;
  const depreciationPerMonth = depreciationPerYear / 12;

  // Get last depreciation to calculate opening value
  const lastDep = await prisma.erpAssetDepreciation.findFirst({
    where: { assetId: id },
    orderBy: { createdAt: 'desc' },
  });

  const openingValue = lastDep ? Number(lastDep.closingValue) : Number(asset.purchaseCost);
  const depreciationExp = Math.min(depreciationPerMonth, openingValue - Number(asset.salvageValue));
  const closingValue = openingValue - depreciationExp;

  const depreciation = await prisma.erpAssetDepreciation.create({
    data: {
      assetId: id,
      period: period as string,
      openingValue: openingValue,
      depreciationExp: depreciationExp,
      closingValue: closingValue,
      status: 'pending',
    },
  });

  return ok(depreciation);
}

async function getRequest(request: NextRequest) {
  return request.json();
}

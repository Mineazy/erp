import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody, badRequest, created, getNextSequence } from '@/lib/api';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return unauthorized();

  // Verify asset exists
  const asset = await prisma.erpAsset.findUnique({ where: { id: params.id } });
  if (!asset) return notFound('Asset not found');

  const maintenances = await prisma.erpAssetMaintenance.findMany({
    where: { assetId: params.id },
    include: { branch: true },
    orderBy: { maintenanceDate: 'desc' },
  });

  return ok(maintenances);
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return unauthorized();

  // Verify asset exists
  const asset = await prisma.erpAsset.findUnique({ where: { id: params.id } });
  if (!asset) return notFound('Asset not found');

  const body = await getBody(request);
  const { type, maintenanceDate, description, performedBy, cost, vendor, nextDate, status, notes } = body;

  if (!type || !maintenanceDate || !cost) {
    return badRequest('Type, maintenance date, and cost are required');
  }

  const maintenanceNo = await getNextSequence(prisma, 'erpAssetMaintenance', 'maintenanceNo', 'MNT');

  const maintenance = await prisma.erpAssetMaintenance.create({
    data: {
      maintenanceNo,
      assetId: params.id,
      type: type as string,
      maintenanceDate: new Date(maintenanceDate as string),
      description: description as string | undefined,
      performedBy: performedBy as string | undefined,
      cost: parseFloat(cost as string),
      vendor: vendor as string | undefined,
      nextDate: nextDate ? new Date(nextDate as string) : undefined,
      status: (status as string) || 'completed',
      notes: notes as string | undefined,
      branchId: (session.user as any)?.branchId || null,
    },
    include: { branch: true },
  });

  return created(maintenance);
}

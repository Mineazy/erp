import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody, badRequest } from '@/lib/api';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const asset = await prisma.erpAsset.findUnique({
    where: { id: params.id },
    include: {
      category: true,
      branch: true,
      depreciations: { orderBy: { createdAt: 'desc' } },
      maintenances: { orderBy: { createdAt: 'desc' } },
      transfers: { orderBy: { createdAt: 'desc' } },
      checkouts: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!asset) return notFound('Asset not found');
  return ok(asset);
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const {
    name,
    description,
    location,
    locationDetails,
    status,
    assetCondition,
    assignedTo,
    assignedToName,
    custodian,
    warrantyExpiry,
    lastInspection,
    nextInspection,
  } = body;

  const asset = await prisma.erpAsset.findUnique({ where: { id: params.id } });
  if (!asset) return notFound('Asset not found');

  const updated = await prisma.erpAsset.update({
    where: { id: params.id },
    data: {
      name: name ? (name as string) : undefined,
      description: description ? (description as string) : undefined,
      location: location ? (location as string) : undefined,
      locationDetails: locationDetails ? (locationDetails as string) : undefined,
      status: status ? (status as string) : undefined,
      assetCondition: assetCondition ? (assetCondition as string) : undefined,
      assignedTo: assignedTo ? (assignedTo as string) : undefined,
      assignedToName: assignedToName ? (assignedToName as string) : undefined,
      custodian: custodian ? (custodian as string) : undefined,
      warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry as string) : undefined,
      lastInspection: lastInspection ? new Date(lastInspection as string) : undefined,
      nextInspection: nextInspection ? new Date(nextInspection as string) : undefined,
    },
    include: { category: true, branch: true },
  });

  return ok(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const asset = await prisma.erpAsset.findUnique({ where: { id: params.id } });
  if (!asset) return notFound('Asset not found');

  await prisma.erpAsset.delete({ where: { id: params.id } });
  return ok({ message: 'Asset deleted successfully' });
}

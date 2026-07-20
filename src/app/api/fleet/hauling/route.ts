import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, getBody } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const trips = await prisma.erpHaulingTrip.findMany({
    orderBy: { createdAt: 'desc' },
    include: { vehicle: true }
  });

  return ok(trips);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const {
    action,
    vehicleId,
    driverName,
    sourceWarehouseId,
    sourceWarehouseName,
    destinationBranchId,
    destinationBranchName,
    productDetails,
    tripId
  } = body;

  if (action === 'create') {
    if (!vehicleId || !driverName || !productDetails) {
      return badRequest('Vehicle, driver, and product details are required');
    }

    const trip = await prisma.erpHaulingTrip.create({
      data: {
        vehicleId,
        driverName,
        sourceWarehouseId,
        sourceWarehouseName,
        destinationBranchId,
        destinationBranchName,
        productDetails,
        status: 'SCHEDULED'
      }
    });

    return ok(trip);
  }

  if (action === 'start') {
    if (!tripId) return badRequest('Trip ID is required');

    const updated = await prisma.erpHaulingTrip.update({
      where: { id: tripId },
      data: {
        status: 'IN_TRANSIT',
        departureTime: new Date()
      },
      include: { vehicle: true }
    });

    // Automatically set vehicle status to in_transit
    await prisma.erpVehicle.update({
      where: { id: updated.vehicleId },
      data: { status: 'in_transit' }
    });

    return ok(updated);
  }

  if (action === 'deliver') {
    if (!tripId) return badRequest('Trip ID is required');

    const updated = await prisma.erpHaulingTrip.update({
      where: { id: tripId },
      data: {
        status: 'DELIVERED',
        arrivalTime: new Date()
      },
      include: { vehicle: true }
    });

    // Revert vehicle status back to active
    await prisma.erpVehicle.update({
      where: { id: updated.vehicleId },
      data: { status: 'active' }
    });

    return ok(updated);
  }

  return badRequest('Unknown action');
}

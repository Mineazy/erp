import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, getBody } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const requisitions = await prisma.erpFuelRequisition.findMany({
    orderBy: { createdAt: 'desc' },
    include: { vehicle: true }
  });

  return ok(requisitions);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = (await getBody(request)) as any;
  const { action, vehicleId, litersRequested, purpose, requisitionId } = body;
  const currentUserId = (session.user as any)?.id || 'system';
  const currentUserName = session.user?.name || 'Administrator';

  if (action === 'create') {
    const { fuelType, gasStation, currentOdometer, driverName, branch, destination } = body;
    if (!vehicleId || !litersRequested || !purpose || !fuelType) {
      return badRequest('Vehicle, liters requested, purpose, and fuel type are required');
    }
    if (!currentOdometer || !driverName || !branch || !destination) {
      return badRequest('Driver name, branch, destination, and current odometer reading are required');
    }

    const vehicle = await prisma.erpVehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) return badRequest('Vehicle not found');

    const req = await prisma.erpFuelRequisition.create({
      data: {
        vehicleId,
        userId: currentUserId,
        userName: currentUserName,
        fuelType,
        gasStation: gasStation || 'Zuva Petroleum Harare',
        litersRequested: Number(litersRequested),
        status: 'PENDING',
        purpose,
        currentOdometer: Number(currentOdometer),
        driverName,
        branch,
        destination
      }
    });

    return ok(req);
  }

  if (action === 'approve_treasurer') {
    if (!requisitionId) return badRequest('Requisition ID is required');

    const req = await prisma.erpFuelRequisition.findUnique({ where: { id: requisitionId } });
    if (!req) return badRequest('Requisition not found');
    if (req.status !== 'PENDING') return badRequest('Requisition must be in PENDING status');

    const updated = await prisma.erpFuelRequisition.update({
      where: { id: requisitionId },
      data: {
        status: 'TREASURER_APPROVED',
        treasurerApprovedBy: currentUserName
      }
    });

    return ok(updated);
  }

  if (action === 'approve_finance') {
    if (!requisitionId) return badRequest('Requisition ID is required');

    const req = (await prisma.erpFuelRequisition.findUnique({
      where: { id: requisitionId },
      include: { vehicle: true }
    })) as any;
    if (!req) return badRequest('Requisition not found');
    if (req.status !== 'TREASURER_APPROVED') {
      return badRequest('Requisition must be approved by Treasurer first');
    }

    // Fetch prepaid fuel balance matching the selected fuelType
    const fuelType = req.fuelType || 'Diesel';
    const fuel = await prisma.erpPrepaidFuel.findFirst({ where: { fuelType } });
    if (!fuel) return badRequest(`Prepaid fuel reserves not configured for type ${fuelType}`);

    const requestedLiters = Number(req.litersRequested);
    if (Number(fuel.balanceLiters) < requestedLiters) {
      return badRequest(`Insufficient prepaid fuel reserves in accounts. Available: ${fuel.balanceLiters}L`);
    }

    // Deduct liters from prepaid fuel balance
    await prisma.erpPrepaidFuel.update({
      where: { id: fuel.id },
      data: { balanceLiters: Number(fuel.balanceLiters) - requestedLiters }
    });

    // Write usage log
    await prisma.erpPrepaidFuelLog.create({
      data: {
        fuelType,
        action: 'USAGE',
        quantity: requestedLiters,
        pricePerLiter: fuel.currentPricePerLiter,
        amount: requestedLiters * Number(fuel.currentPricePerLiter),
        notes: `Fueled vehicle ${req.vehicle.plateNumber} via Requisition #${req.id.slice(0, 8)}`
      }
    });

    // Generate 6-digit barcoded token & QR Code URL pointing to public verification page
    const redeemToken = Math.floor(100000 + Math.random() * 900000).toString();
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`http://localhost:3000/verify/fuel?id=${req.id}`)}`;

    // Update requisition status to approved
    const updated = await prisma.erpFuelRequisition.update({
      where: { id: requisitionId },
      data: {
        status: 'APPROVED',
        approvedBy: currentUserName,
        financeManagerApprovedBy: currentUserName,
        redeemToken,
        qrCodeUrl
      }
    });

    // Automatically log a Fuel Record for the vehicle
    await prisma.erpFuelRecord.create({
      data: {
        vehicleId: req.vehicleId,
        refuelDate: new Date(),
        quantity: requestedLiters,
        unitCost: fuel.currentPricePerLiter,
        totalCost: requestedLiters * Number(fuel.currentPricePerLiter),
        fuelType,
        notes: `Approved by Treasurer (${req.treasurerApprovedBy}) & Finance Manager (${currentUserName}). Token: ${redeemToken}`
      }
    });

    return ok(updated);
  }

  if (action === 'reject') {
    if (!requisitionId) return badRequest('Requisition ID is required');

    const updated = await prisma.erpFuelRequisition.update({
      where: { id: requisitionId },
      data: {
        status: 'REJECTED',
        approvedBy: currentUserName
      }
    });

    return ok(updated);
  }

  return badRequest('Unknown action');
}

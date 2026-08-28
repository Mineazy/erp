import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, forbidden, badRequest, ok, getBody } from '@/lib/api';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const user = session.user as any;
  const role = (user?.role || '') as string;
  const isAdmin = role.toLowerCase() === 'admin';
  const isFuelAttendant = role.toLowerCase() === 'fuel_attendant';

  if (!isAdmin && !isFuelAttendant) {
    return forbidden('Only a Fuel Attendant or Admin can dispense fuel');
  }

  const body = (await getBody(request)) as any;
  const { token, plateNumber, drawdownVoucherNo, attendantName } = body;

  if (!token) return badRequest('Voucher token is required');
  if (!plateNumber) return badRequest('Vehicle plate number is required');
  if (!drawdownVoucherNo) return badRequest('Gas station drawdown voucher number is required');
  if (!attendantName) return badRequest('Attendant name is required');

  // Look up the requisition by redeem token
  const req = (await prisma.erpFuelRequisition.findFirst({
    where: { redeemToken: token },
    include: { vehicle: true }
  })) as any;

  if (!req) {
    return badRequest('Invalid voucher token — no matching requisition found');
  }

  if (req.status === 'DISPENSED') {
    return badRequest('This voucher has already been dispensed');
  }

  if (req.status !== 'APPROVED') {
    return badRequest(`Voucher is not in an approved state (current status: ${req.status})`);
  }

  const fuelType = req.fuelType || 'Diesel';
  const requestedLiters = Number(req.litersRequested);

  // Fetch prepaid fuel balance
  const fuel = await prisma.erpPrepaidFuel.findFirst({ where: { fuelType } });
  if (!fuel) return badRequest(`Prepaid fuel reserves not configured for type ${fuelType}`);

  if (Number(fuel.balanceLiters) < requestedLiters) {
    return badRequest(`Insufficient prepaid fuel reserves. Available: ${fuel.balanceLiters}L, Requested: ${requestedLiters}L`);
  }

  // Deduct liters from prepaid fuel balance
  await prisma.erpPrepaidFuel.update({
    where: { id: fuel.id },
    data: { balanceLiters: Number(fuel.balanceLiters) - requestedLiters }
  });

  // Write dispatch log
  await prisma.erpPrepaidFuelLog.create({
    data: {
      fuelType,
      action: 'DISPATCH',
      quantity: requestedLiters,
      pricePerLiter: fuel.currentPricePerLiter,
      amount: requestedLiters * Number(fuel.currentPricePerLiter),
      notes: `Dispensed to ${req.vehicle.plateNumber} by ${attendantName}. Drawdown: ${drawdownVoucherNo}. Token: ${token}`
    }
  });

  // Update requisition with redemption details
  const updated = await prisma.erpFuelRequisition.update({
    where: { id: req.id },
    data: {
      status: 'DISPENSED',
      redeemedAt: new Date(),
      redeemedBy: attendantName,
      dispensedQuantity: requestedLiters,
      drawdownVoucherNo
    }
  });

  // Update vehicle plate number if different
  if (plateNumber && plateNumber !== req.vehicle.plateNumber) {
    await prisma.erpVehicle.update({
      where: { id: req.vehicleId },
      data: { plateNumber }
    });
  }

  // Auto-generate fuel record for consumption tracking
  const FUEL_UNIT_COST = 1.94;
  await prisma.erpFuelRecord.create({
    data: {
      vehicleId: req.vehicleId,
      refuelDate: new Date(),
      quantity: requestedLiters,
      unitCost: FUEL_UNIT_COST,
      totalCost: requestedLiters * FUEL_UNIT_COST,
      odometer: req.currentOdometer ? parseInt(String(req.currentOdometer)) : null,
      fuelType,
      vendor: req.gasStation || null,
      notes: `Auto from requisition — Token: ${token}, Drawdown: ${drawdownVoucherNo}`
    }
  });

  // Update vehicle odometer if provided
  if (req.currentOdometer) {
    await prisma.erpVehicle.update({
      where: { id: req.vehicleId },
      data: { currentOdometer: parseInt(String(req.currentOdometer)) }
    });
  }

  return ok({
    success: true,
    message: 'Fuel dispatched successfully',
    requisition: updated,
    deduction: {
      fuelType,
      litersDeducted: requestedLiters,
      remainingBalance: Number(fuel.balanceLiters) - requestedLiters
    }
  });
}

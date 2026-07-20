import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const totalVehicles = await prisma.erpVehicle.count();
  const totalServiceCostsAgg = await prisma.erpVehicleService.aggregate({
    _sum: { cost: true }
  });
  const totalServiceCosts = Number(totalServiceCostsAgg._sum.cost || 0);

  const prepaidFuels = await prisma.erpPrepaidFuel.findMany();
  const totalPrepaidDiesel = Number(prepaidFuels.find(f => f.fuelType === 'Diesel')?.balanceLiters || 0);
  const totalPrepaidPetrol = Number(prepaidFuels.find(f => f.fuelType === 'Petrol')?.balanceLiters || 0);

  // Calculate total fuel issued via approved requisitions
  const fuelIssuedAgg = await prisma.erpFuelRequisition.aggregate({
    where: { status: 'APPROVED' },
    _sum: { litersRequested: true }
  });
  const totalFuelIssued = Number(fuelIssuedAgg._sum.litersRequested || 0);

  // Trips metrics
  const totalTrips = await prisma.erpHaulingTrip.count();
  const activeTrips = await prisma.erpHaulingTrip.count({ where: { status: 'IN_TRANSIT' } });
  const completedTrips = await prisma.erpHaulingTrip.count({ where: { status: 'DELIVERED' } });

  // Get fuel usages logs over time
  const usageLogs = await prisma.erpPrepaidFuelLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  return ok({
    metrics: {
      totalVehicles,
      totalServiceCosts,
      totalPrepaidDiesel,
      totalPrepaidPetrol,
      totalFuelIssued,
      trips: {
        totalTrips,
        activeTrips,
        completedTrips
      }
    },
    logs: usageLogs
  });
}

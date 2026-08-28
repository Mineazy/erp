import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  // Vehicle counts by status
  const totalVehicles = await prisma.erpVehicle.count();
  const activeVehicles = await prisma.erpVehicle.count({ where: { status: 'ACTIVE' } });
  const inTransitVehicles = await prisma.erpVehicle.count({ where: { status: 'IN_TRANSIT' } });
  const maintenanceVehicles = await prisma.erpVehicle.count({ where: { status: 'MAINTENANCE' } });

  // Fuel metrics
  const fuelRecords = await prisma.erpFuelRecord.findMany({
    include: { vehicle: { select: { id: true, plateNumber: true, make: true, model: true } } },
    orderBy: { refuelDate: 'desc' },
  });
  const totalFuelUsed = fuelRecords.reduce((s, r) => s + Number(r.quantity), 0);
  const totalFuelCost = fuelRecords.reduce((s, r) => s + Number(r.totalCost), 0);

  // Fuel by type
  const dieselRecords = fuelRecords.filter(r => r.fuelType === 'Diesel');
  const petrolRecords = fuelRecords.filter(r => r.fuelType === 'Petrol');
  const dieselUsed = dieselRecords.reduce((s, r) => s + Number(r.quantity), 0);
  const petrolUsed = petrolRecords.reduce((s, r) => s + Number(r.quantity), 0);

  // Prepaid balances
  const prepaidFuels = await prisma.erpPrepaidFuel.findMany();
  const prepaidDiesel = Number(prepaidFuels.find(f => f.fuelType === 'Diesel')?.balanceLiters || 0);
  const prepaidPetrol = Number(prepaidFuels.find(f => f.fuelType === 'Petrol')?.balanceLiters || 0);

  // Service metrics
  const totalServiceCostAgg = await prisma.erpServiceRecord.aggregate({ _sum: { cost: true } });
  const totalServiceCost = Number(totalServiceCostAgg._sum.cost || 0);
  const totalServices = await prisma.erpServiceRecord.count();

  // Upcoming services (next 30 days)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const upcomingServices = await prisma.erpServiceRecord.findMany({
    where: { nextServiceDate: { lte: thirtyDaysFromNow, gte: new Date() } },
    include: { vehicle: { select: { plateNumber: true, make: true, model: true } } },
    orderBy: { nextServiceDate: 'asc' },
    take: 5,
  });

  // Trips
  const totalTrips = await prisma.erpHaulingTrip.count();
  const activeTrips = await prisma.erpHaulingTrip.count({ where: { status: 'IN_TRANSIT' } });
  const completedTrips = await prisma.erpHaulingTrip.count({ where: { status: 'DELIVERED' } });
  const scheduledTrips = await prisma.erpHaulingTrip.count({ where: { status: 'SCHEDULED' } });

  // Recent trips
  const recentTrips = await prisma.erpHaulingTrip.findMany({
    include: { vehicle: { select: { plateNumber: true, make: true, model: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  // Recent fuel records
  const recentFuel = fuelRecords.slice(0, 5);

  // Fuel by month (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const recentFuelRecords = fuelRecords.filter(r => new Date(r.refuelDate) >= sixMonthsAgo);
  const fuelByMonth: Record<string, { quantity: number; cost: number }> = {};
  for (const r of recentFuelRecords) {
    const key = new Date(r.refuelDate).toISOString().slice(0, 7);
    if (!fuelByMonth[key]) fuelByMonth[key] = { quantity: 0, cost: 0 };
    fuelByMonth[key].quantity += Number(r.quantity);
    fuelByMonth[key].cost += Number(r.totalCost);
  }

  // Top consumers (vehicles by fuel used)
  const fuelByVehicle: Record<string, { plateNumber: string; make: string; model: string; quantity: number; cost: number }> = {};
  for (const r of fuelRecords) {
    const v = r.vehicleId;
    if (!fuelByVehicle[v]) {
      fuelByVehicle[v] = { plateNumber: r.vehicle?.plateNumber || '—', make: r.vehicle?.make || '', model: r.vehicle?.model || '', quantity: 0, cost: 0 };
    }
    fuelByVehicle[v].quantity += Number(r.quantity);
    fuelByVehicle[v].cost += Number(r.totalCost);
  }
  const topConsumers = Object.entries(fuelByVehicle)
    .sort(([, a], [, b]) => b.quantity - a.quantity)
    .slice(0, 5)
    .map(([vehicleId, data]) => ({ vehicleId, ...data }));

  return ok({
    vehicles: { total: totalVehicles, active: activeVehicles, inTransit: inTransitVehicles, maintenance: maintenanceVehicles },
    fuel: {
      totalUsed: totalFuelUsed,
      totalCost: totalFuelCost,
      dieselUsed,
      petrolUsed,
      prepaidDiesel,
      prepaidPetrol,
      recent: recentFuel,
      byMonth: Object.entries(fuelByMonth).sort(([a], [b]) => a.localeCompare(b)),
      topConsumers,
    },
    services: { total: totalServices, totalCost: totalServiceCost, upcoming: upcomingServices },
    trips: { total: totalTrips, active: activeTrips, completed: completedTrips, scheduled: scheduledTrips, recent: recentTrips },
  });
}

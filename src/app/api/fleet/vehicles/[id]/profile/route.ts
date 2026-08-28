import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok, notFound } from '@/lib/api';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const { id } = await params;

    const vehicle = await prisma.erpVehicle.findUnique({
      where: { id },
      include: {
        haulingTrips: { orderBy: { createdAt: 'desc' } },
        services: { orderBy: { serviceDate: 'desc' }, include: { items: true } },
      },
    });

    if (!vehicle) return notFound();

    const fuelRecords = await prisma.erpFuelRecord.findMany({
      where: { vehicleId: id },
      orderBy: { refuelDate: 'desc' },
    });

    const dispatches = await prisma.erpVehicleDispatch.findMany({
      where: { vehicleId: id },
      orderBy: { dispatchedAt: 'desc' },
    });

    const totalFuelUsed = fuelRecords.reduce((sum, r) => sum + Number(r.quantity), 0);
    const totalFuelCost = fuelRecords.reduce((sum, r) => sum + Number(r.totalCost), 0);
    const totalServiceCost = vehicle.services.reduce((sum, s) => sum + Number(s.cost), 0);
    const totalTrips = vehicle.haulingTrips.length;
    const completedTrips = vehicle.haulingTrips.filter(t => t.status === 'DELIVERED').length;
    const totalDispatches = dispatches.length;

    const totalDistance = dispatches.reduce((sum, d) => sum + (Number(d.distanceKm) || 0), 0);

    const avgFuelPerTrip = totalTrips > 0 ? totalFuelUsed / totalTrips : 0;

    const lastService = vehicle.services[0] || null;
    const nextServiceDate = lastService?.nextServiceDate || null;
    const nextServiceOdometer = lastService?.nextServiceOdometer || null;
    const currentOdometer = Number(vehicle.currentOdometer);

    const fuelByMonth: Record<string, { quantity: number; cost: number }> = {};
    for (const r of fuelRecords) {
      const key = new Date(r.refuelDate).toISOString().slice(0, 7);
      if (!fuelByMonth[key]) fuelByMonth[key] = { quantity: 0, cost: 0 };
      fuelByMonth[key].quantity += Number(r.quantity);
      fuelByMonth[key].cost += Number(r.totalCost);
    }

    const tripsByMonth: Record<string, { total: number; completed: number }> = {};
    for (const t of vehicle.haulingTrips) {
      const key = new Date(t.createdAt).toISOString().slice(0, 7);
      if (!tripsByMonth[key]) tripsByMonth[key] = { total: 0, completed: 0 };
      tripsByMonth[key].total++;
      if (t.status === 'DELIVERED') tripsByMonth[key].completed++;
    }

    return ok({
      vehicle,
      fuelRecords,
      dispatches,
      summary: {
        totalFuelUsed,
        totalFuelCost,
        totalServiceCost,
        totalTrips,
        completedTrips,
        totalDispatches,
        totalDistance,
        avgFuelPerTrip,
        lastServiceDate: lastService?.serviceDate || null,
        nextServiceDate,
        nextServiceOdometer,
        currentOdometer,
      },
      fuelByMonth: Object.entries(fuelByMonth).sort(([a], [b]) => a.localeCompare(b)),
      tripsByMonth: Object.entries(tripsByMonth).sort(([a], [b]) => a.localeCompare(b)),
    });
  } catch (error: any) {
    console.error('API ERROR in vehicle profile:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, getBody } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const services = await prisma.erpServiceRecord.findMany({
    orderBy: { serviceDate: 'desc' },
    include: { vehicle: true }
  });

  return ok(services);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = (await getBody(request)) as any;
  const { vehicleId, serviceType, cost, description, odometerAtService, serviceDate } = body;

  if (!vehicleId || !serviceType || !cost) {
    return badRequest('Vehicle, service type, and cost are required');
  }

  const service = await prisma.erpServiceRecord.create({
    data: {
      vehicleId,
      serviceType,
      cost: Number(cost),
      description: description || '',
      odometer: Number(odometerAtService || 0),
      serviceDate: new Date(serviceDate || Date.now())
    }
  });

  // Temporarily set vehicle status to maintenance during service
  await prisma.erpVehicle.update({
    where: { id: vehicleId },
    data: {
      status: 'maintenance',
      currentOdometer: Number(odometerAtService || 0)
    }
  });

  return ok(service);
}

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, getBody } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  // Seed vehicles if none exist
  const count = await prisma.erpVehicle.count();
  if (count === 0) {
    await prisma.erpVehicle.create({
      data: {
        plateNumber: 'HGV-992-ZW',
        make: 'Volvo',
        model: 'FH16 Hauler',
        type: 'heavy_truck',
        status: 'active',
        assignedDriver: 'Arthur Dent',
        currentOdometer: 125000,
        latitude: -17.8251,
        longitude: 31.0531,
        speed: 65.0,
        lastPing: new Date()
      }
    });
    await prisma.erpVehicle.create({
      data: {
        plateNumber: 'HGV-440-ZW',
        make: 'Scania',
        model: 'R500 Transporter',
        type: 'heavy_truck',
        status: 'in_transit',
        assignedDriver: 'Ford Prefect',
        currentOdometer: 98000,
        latitude: -18.9251,
        longitude: 29.8531,
        speed: 72.0,
        lastPing: new Date()
      }
    });
  }

  const vehicles = await prisma.erpVehicle.findMany({
    orderBy: { plateNumber: 'asc' },
    include: {
      services: true,
      fuelRequisitions: true,
      haulingTrips: true
    }
  });

  return ok(vehicles);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = (await getBody(request)) as any;
  const { plateNumber, make, model, type, status, currentOdometer, assignedDriver } = body;

  if (!plateNumber || !make || !model) {
    return badRequest('Plate number, make, and model are required');
  }

  try {
    const vehicle = await prisma.erpVehicle.create({
      data: {
        plateNumber,
        make,
        model,
        type: type || 'heavy_truck',
        status: status || 'active',
        assignedDriver,
        currentOdometer: Number(currentOdometer || 0),
        latitude: -17.8251, // default center
        longitude: 31.0531,
        speed: 0.0,
        lastPing: new Date()
      }
    });
    return ok(vehicle);
  } catch (err: any) {
    return badRequest(err.message || 'Failed to create vehicle');
  }
}

// Simulates live integrated GPS tracking movements on PUT requests
export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = (await getBody(request)) as any;
  const { vehicleId, simulateMove } = body;

  if (!vehicleId) return badRequest('Vehicle ID is required');

  const vehicle = await prisma.erpVehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) return badRequest('Vehicle not found');

  let lat = Number(vehicle.latitude || -17.8251);
  let lng = Number(vehicle.longitude || 31.0531);
  let speed = Number(vehicle.speed || 60);

  if (simulateMove) {
    // Add small random jitter to simulate truck movement along a highway path
    lat += (Math.random() - 0.5) * 0.01;
    lng += (Math.random() - 0.5) * 0.01;
    speed = Math.floor(60 + Math.random() * 20);
  }

  const updated = await prisma.erpVehicle.update({
    where: { id: vehicleId },
    data: {
      latitude: lat,
      longitude: lng,
      speed,
      lastPing: new Date()
    }
  });

  return ok(updated);
}

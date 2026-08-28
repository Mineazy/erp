import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok, created, getBody, parseListParams } from '@/lib/api';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const sp = parseListParams(request.nextUrl.searchParams);
    const vehicleId = request.nextUrl.searchParams.get('vehicleId');
    const search = sp.search;
    const page = sp.page || 1;
    const limit = sp.limit || 50;

    const where: Record<string, unknown> = {};
    if (vehicleId) where.vehicleId = vehicleId;
    if (search) {
      where.OR = [
        { vendor: { contains: search } },
        { fuelType: { contains: search } },
        { notes: { contains: search } },
        { vehicle: { plateNumber: { contains: search } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.erpFuelRecord.findMany({
        where,
        include: { vehicle: { select: { id: true, plateNumber: true, make: true, model: true } } },
        orderBy: { refuelDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.erpFuelRecord.count({ where }),
    ]);

    return ok({ items, total, page, limit });
  } catch (error: any) {
    console.error('API ERROR in fuel-logs:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const body = await getBody(request);
    const { vehicleId, refuelDate, quantity, unitCost, odometer, fuelType, vendor, notes } = body as any;

    if (!vehicleId) return new Response('vehicleId is required', { status: 400 });

    const totalCost = (parseFloat(quantity) || 0) * (parseFloat(unitCost) || 0);

    const record = await prisma.erpFuelRecord.create({
      data: {
        vehicleId,
        refuelDate: refuelDate ? new Date(refuelDate) : new Date(),
        quantity: parseFloat(quantity) || 0,
        unitCost: parseFloat(unitCost) || 0,
        totalCost,
        odometer: odometer ? parseInt(odometer) : null,
        fuelType: fuelType || null,
        vendor: vendor || null,
        notes: notes || null,
      },
      include: { vehicle: { select: { id: true, plateNumber: true, make: true, model: true } } },
    });

    if (odometer) {
      await prisma.erpVehicle.update({
        where: { id: vehicleId },
        data: { currentOdometer: parseInt(odometer) },
      });
    }

    return created(record);
  } catch (error: any) {
    console.error('API ERROR in POST fuel-log:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

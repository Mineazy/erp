import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok, created, getBody } from '@/lib/api';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const { id } = await params;
    const services = await prisma.erpServiceRecord.findMany({
      where: { vehicleId: id },
      orderBy: { serviceDate: 'desc' },
      include: { items: true },
    });

    return ok(services);
  } catch (error: any) {
    console.error('API ERROR in vehicle services:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const { id } = await params;
    const body = await getBody(request);
    const { serviceDate, serviceType, description, mechanicName, mechanicContact, odometer, cost, vendor, nextServiceDate, nextServiceOdometer, serviceIntervalKm, serviceIntervalDays, notes, items } = body as any;

    const service = await prisma.erpServiceRecord.create({
      data: {
        vehicleId: id,
        serviceDate: new Date(serviceDate),
        serviceType,
        description: description || null,
        mechanicName: mechanicName || null,
        mechanicContact: mechanicContact || null,
        odometer: odometer ? parseInt(odometer) : null,
        cost: parseFloat(cost) || 0,
        vendor: vendor || null,
        nextServiceDate: nextServiceDate ? new Date(nextServiceDate) : null,
        nextServiceOdometer: nextServiceOdometer ? parseInt(nextServiceOdometer) : null,
        serviceIntervalKm: serviceIntervalKm ? parseInt(serviceIntervalKm) : null,
        serviceIntervalDays: serviceIntervalDays ? parseInt(serviceIntervalDays) : null,
        notes: notes || null,
        items: items && items.length > 0 ? {
          create: items.map((item: any) => ({
            itemName: item.itemName,
            itemType: item.itemType || 'part',
            action: item.action || 'replaced',
            quantity: parseInt(item.quantity) || 1,
            unitCost: parseFloat(item.unitCost) || 0,
            totalCost: parseFloat(item.totalCost) || 0,
            notes: item.notes || null,
          }))
        } : undefined,
      },
      include: { items: true },
    });

    if (odometer) {
      await prisma.erpVehicle.update({
        where: { id },
        data: { currentOdometer: parseInt(odometer) },
      });
    }

    return created(service);
  } catch (error: any) {
    console.error('API ERROR in POST vehicle service:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

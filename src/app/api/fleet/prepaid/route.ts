import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, getBody } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  // Initialize seed records if they don't exist
  let diesel = await prisma.erpPrepaidFuel.findFirst({ where: { fuelType: 'Diesel' } });
  if (!diesel) {
    await prisma.erpPrepaidFuel.create({
      data: { fuelType: 'Diesel', balanceLiters: 10000.00, currentPricePerLiter: 1.25, lastTopUpAmount: 10000.00 }
    });
  }
  let petrol = await prisma.erpPrepaidFuel.findFirst({ where: { fuelType: 'Petrol' } });
  if (!petrol) {
    await prisma.erpPrepaidFuel.create({
      data: { fuelType: 'Petrol', balanceLiters: 8000.00, currentPricePerLiter: 1.40, lastTopUpAmount: 8000.00 }
    });
  }

  const fuels = await prisma.erpPrepaidFuel.findMany();
  const logs = await prisma.erpPrepaidFuelLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 30
  });

  return ok({ fuels, logs });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = (await getBody(request)) as any;
  const { action, fuelType, quantity, pricePerLiter, notes } = body;

  if (!fuelType || !['Diesel', 'Petrol'].includes(fuelType)) {
    return badRequest('Invalid fuel type. Choose Diesel or Petrol.');
  }

  const record = await prisma.erpPrepaidFuel.findFirst({ where: { fuelType } });
  if (!record) return badRequest('Prepaid fuel record not found');

  if (action === 'topup') {
    const qty = Number(quantity || 0);
    const price = Number(pricePerLiter || record.currentPricePerLiter);
    const amount = qty * price;

    if (qty <= 0) return badRequest('Quantity must be greater than zero');

    // Update prepaid balance
    const updated = await prisma.erpPrepaidFuel.update({
      where: { id: record.id },
      data: {
        balanceLiters: Number(record.balanceLiters) + qty,
        currentPricePerLiter: price,
        lastTopUpAmount: qty
      }
    });

    // Write log
    await prisma.erpPrepaidFuelLog.create({
      data: {
        fuelType,
        action: 'TOPUP',
        quantity: qty,
        pricePerLiter: price,
        amount,
        notes: notes || `Top up of ${qty} liters`
      }
    });

    return ok(updated);
  }

  if (action === 'adjust_qty') {
    const qty = Number(quantity);
    if (isNaN(qty)) return badRequest('Valid quantity value required');

    const updated = await prisma.erpPrepaidFuel.update({
      where: { id: record.id },
      data: { balanceLiters: qty }
    });

    await prisma.erpPrepaidFuelLog.create({
      data: {
        fuelType,
        action: 'ADJUST_QTY',
        quantity: qty,
        pricePerLiter: record.currentPricePerLiter,
        amount: 0,
        notes: notes || `Prepaid quantity adjusted directly to ${qty}L`
      }
    });

    return ok(updated);
  }

  if (action === 'adjust_price') {
    const price = Number(pricePerLiter);
    if (isNaN(price) || price <= 0) return badRequest('Valid price value required');

    const updated = await prisma.erpPrepaidFuel.update({
      where: { id: record.id },
      data: { currentPricePerLiter: price }
    });

    await prisma.erpPrepaidFuelLog.create({
      data: {
        fuelType,
        action: 'ADJUST_PRICE',
        quantity: 0,
        pricePerLiter: price,
        amount: 0,
        notes: notes || `Unit price adjusted directly to $${price}`
      }
    });

    return ok(updated);
  }

  return badRequest('Unknown action');
}

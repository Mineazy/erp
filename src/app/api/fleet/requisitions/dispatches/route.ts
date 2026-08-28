import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const user = session.user as any;
  const role = (user?.role || '') as string;
  const isAdmin = role.toLowerCase() === 'admin';

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const attendant = searchParams.get('attendant') || '';

  // Start and end of the specified date
  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd = new Date(`${date}T23:59:59.999Z`);

  try {
    // Fetch all dispensed requisitions for the day
    const where: any = {
      status: 'DISPENSED',
      redeemedAt: { gte: dayStart, lte: dayEnd }
    };

    // Non-admins only see their own dispatches
    if (!isAdmin && role === 'fuel_attendant') {
      where.redeemedBy = user?.name || '';
    } else if (attendant) {
      where.redeemedBy = attendant;
    }

    const dispatches = await prisma.erpFuelRequisition.findMany({
      where,
      include: { vehicle: true },
      orderBy: { redeemedAt: 'asc' }
    });

    // Fetch prepaid balances
    const prepaid = await prisma.erpPrepaidFuel.findMany();

    // Build summary
    const totalByFuelType: Record<string, { liters: number; count: number }> = {};
    for (const d of dispatches) {
      const ft = d.fuelType || 'Diesel';
      if (!totalByFuelType[ft]) totalByFuelType[ft] = { liters: 0, count: 0 };
      totalByFuelType[ft].liters += Number(d.dispensedQuantity || d.litersRequested);
      totalByFuelType[ft].count += 1;
    }

    return ok({
      date,
      attendant: isAdmin ? (attendant || 'All Attendants') : (user?.name || ''),
      dispatches: dispatches.map(d => ({
        id: d.id,
        token: d.redeemToken,
        plateNumber: d.vehicle?.plateNumber || '',
        vehicleDetails: d.vehicle ? `${d.vehicle.make} ${d.vehicle.model}` : '',
        fuelType: d.fuelType,
        liters: Number(d.dispensedQuantity || d.litersRequested),
        drawdownVoucherNo: d.drawdownVoucherNo || '',
        gasStation: d.gasStation || '',
        redeemedBy: d.redeemedBy || '',
        redeemedAt: d.redeemedAt?.toISOString() || '',
      })),
      summary: totalByFuelType,
      prepaidBalances: prepaid.map(p => ({
        fuelType: p.fuelType,
        balanceLiters: Number(p.balanceLiters),
        pricePerLiter: Number(p.currentPricePerLiter),
      })),
      totalDispatches: dispatches.length,
    });
  } catch (error) {
    return ok({
      date,
      attendant: user?.name || '',
      dispatches: [],
      summary: {},
      prepaidBalances: [],
      totalDispatches: 0,
    });
  }
}

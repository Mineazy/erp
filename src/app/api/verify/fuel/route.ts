import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Requisition ID is required' }, { status: 400 });
  }

  try {
    const req = await prisma.erpFuelRequisition.findUnique({
      where: { id },
      include: { vehicle: true }
    });

    if (!req) {
      return NextResponse.json({ verified: false, error: 'Invalid Voucher: Requisition record not found in system' }, { status: 404 });
    }

    return NextResponse.json({
      verified: req.status === 'APPROVED',
      status: req.status,
      voucher: {
        id: req.id,
        plateNumber: req.vehicle.plateNumber,
        vehicleDetails: `${req.vehicle.make} ${req.vehicle.model}`,
        fuelType: req.fuelType,
        liters: req.litersRequested,
        gasStation: req.gasStation,
        treasurerApprovedBy: req.treasurerApprovedBy,
        financeManagerApprovedBy: req.financeManagerApprovedBy,
        token: req.redeemToken,
        createdAt: req.createdAt
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Verification search failed' }, { status: 500 });
  }
}

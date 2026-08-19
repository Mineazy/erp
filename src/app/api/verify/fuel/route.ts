import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const token = searchParams.get('token');

  if (!id && !token) {
    return NextResponse.json({ error: 'Requisition ID or redeem token is required' }, { status: 400 });
  }

  try {
    const req = id
      ? await prisma.erpFuelRequisition.findUnique({
          where: { id },
          include: { vehicle: true }
        })
      : await prisma.erpFuelRequisition.findFirst({
          where: { redeemToken: token },
          include: { vehicle: true }
        });

    if (!req) {
      return NextResponse.json({ verified: false, error: 'Invalid Voucher: Requisition record not found in system' }, { status: 404 });
    }

    const tokenMatch = !token || req.redeemToken === token;

    return NextResponse.json({
      verified: req.status === 'APPROVED' && tokenMatch,
      status: req.status,
      tokenMatch,
      voucher: {
        id: req.id,
        plateNumber: req.vehicle.plateNumber,
        vehicleDetails: `${req.vehicle.make} ${req.vehicle.model}`,
        fuelType: req.fuelType,
        liters: req.litersRequested,
        gasStation: req.gasStation,
        treasurerApprovedBy: req.treasurerApprovedBy,
        treasurerApprovedAt: req.treasurerApprovedAt,
        financeManagerApprovedBy: req.financeManagerApprovedBy,
        financeManagerApprovedAt: req.financeManagerApprovedAt,
        token: req.redeemToken,
        createdAt: req.createdAt
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Verification search failed' }, { status: 500 });
  }
}

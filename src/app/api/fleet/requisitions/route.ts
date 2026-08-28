import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, forbidden, badRequest, ok, getBody } from '@/lib/api';

const APPROVER_ROLES = ['admin', 'treasurer', 'finance_manager'];

function isApproverRole(role?: string | null): boolean {
  return APPROVER_ROLES.includes((role || '').toLowerCase());
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const user = session.user as any;
  const role = user?.role as string | undefined;

  try {
    // Regular users only see requisitions they submitted. Approvers & Admins
    // see every submission regardless of approval stage.
    const requisitions = await prisma.erpFuelRequisition.findMany({
      where: isApproverRole(role) ? {} : { userId: user?.id || undefined },
      orderBy: { createdAt: 'desc' },
      include: { vehicle: true }
    });

    return ok(requisitions);
  } catch (error) {
    // Fallback: return all requisitions if filtering fails
    const requisitions = await prisma.erpFuelRequisition.findMany({
      orderBy: { createdAt: 'desc' },
      include: { vehicle: true }
    });
    return ok(requisitions);
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = (await getBody(request)) as any;
  const { action, vehicleId, litersRequested, purpose, requisitionId } = body;
  const currentUserId = (session.user as any)?.id || 'system';
  const currentUserName = session.user?.name || 'Administrator';
  const currentRole = ((session.user as any)?.role || '') as string;
  const isAdmin = currentRole.toLowerCase() === 'admin';

  if (action === 'create') {
    const { fuelType, gasStation, currentOdometer, driverName, branch, destination, customVehicle } = body;
    if (!litersRequested || !purpose || !fuelType) {
      return badRequest('Liters requested, purpose, and fuel type are required');
    }
    if (!currentOdometer || !driverName || !branch || !destination) {
      return badRequest('Driver name, branch, destination, and current odometer reading are required');
    }

    let finalVehicleId = vehicleId;

    // Handle custom vehicle - create it first
    if (!vehicleId && customVehicle) {
      const { plateNumber, make, model } = customVehicle;
      if (!plateNumber || !make || !model) {
        return badRequest('Custom vehicle requires plate number, make, and model');
      }
      try {
        const newVehicle = await prisma.erpVehicle.create({
          data: {
            plateNumber,
            make,
            model,
            type: 'heavy_truck',
            status: 'active',
            assignedDriver: driverName,
            currentOdometer: Number(currentOdometer || 0),
            latitude: -17.8251,
            longitude: 31.0531,
            speed: 0.0,
            lastPing: new Date()
          }
        });
        finalVehicleId = newVehicle.id;
      } catch (err: any) {
        return badRequest(err.message || 'Failed to create custom vehicle');
      }
    }

    if (!finalVehicleId) return badRequest('Vehicle is required');

    const vehicle = await prisma.erpVehicle.findUnique({ where: { id: finalVehicleId } });
    if (!vehicle) return badRequest('Vehicle not found');

    const req = await prisma.erpFuelRequisition.create({
      data: {
        vehicleId: finalVehicleId,
        userId: currentUserId,
        userName: currentUserName,
        fuelType,
        gasStation: gasStation || 'Zuva Petroleum Harare',
        litersRequested: Number(litersRequested),
        status: 'PENDING',
        purpose,
        currentOdometer: Number(currentOdometer),
        driverName,
        branch,
        destination
      }
    });

    return ok(req);
  }

  if (action === 'approve_treasurer') {
    if (!isAdmin && currentRole.toLowerCase() !== 'treasurer') return forbidden('Only a Treasurer or Admin can approve at this stage');
    if (!requisitionId) return badRequest('Requisition ID is required');

    const req = await prisma.erpFuelRequisition.findUnique({ where: { id: requisitionId } });
    if (!req) return badRequest('Requisition not found');
    if (req.status !== 'PENDING') return badRequest('Requisition must be in PENDING status');

    const updated = await prisma.erpFuelRequisition.update({
      where: { id: requisitionId },
      data: {
        status: 'TREASURER_APPROVED',
        treasurerApprovedBy: currentUserName,
        treasurerApprovedAt: new Date()
      }
    });

    return ok(updated);
  }

  if (action === 'approve_finance') {
    if (!isAdmin && currentRole.toLowerCase() !== 'finance_manager') return forbidden('Only a Finance Manager or Admin can approve at this stage');
    if (!requisitionId) return badRequest('Requisition ID is required');

    const req = (await prisma.erpFuelRequisition.findUnique({
      where: { id: requisitionId },
      include: { vehicle: true }
    })) as any;
    if (!req) return badRequest('Requisition not found');
    if (req.status !== 'TREASURER_APPROVED') {
      return badRequest('Requisition must be approved by Treasurer first');
    }

    // Generate 6-digit barcoded token & QR Code URL pointing to public verification page
    const redeemToken = Math.floor(100000 + Math.random() * 900000).toString();
    const baseUrl = (process.env.NEXTAUTH_URL || 'https://mineazy.com').replace(/\/$/, '');
    const verifyUrl = `${baseUrl}/verify/fuel?id=${req.id}&token=${encodeURIComponent(redeemToken)}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verifyUrl)}`;

    // Update requisition status to approved (prepaid deduction happens at dispatch/redemption time)
    const updated = await prisma.erpFuelRequisition.update({
      where: { id: requisitionId },
      data: {
        status: 'APPROVED',
        approvedBy: currentUserName,
        financeManagerApprovedBy: currentUserName,
        financeManagerApprovedAt: new Date(),
        redeemToken,
        qrCodeUrl
      }
    });

    return ok(updated);
  }

  if (action === 'reject') {
    if (!isAdmin && !['treasurer', 'finance_manager'].includes(currentRole.toLowerCase())) return forbidden('Only an approver or Admin can reject a requisition');
    if (!requisitionId) return badRequest('Requisition ID is required');

    const reason = body.reason as string | undefined;

    const updated = await prisma.erpFuelRequisition.update({
      where: { id: requisitionId },
      data: {
        status: 'REJECTED',
        approvedBy: currentUserName,
        ...(reason && { notes: reason })
      }
    });

    return ok(updated);
  }

  if (action === 'edit') {
    if (!isApproverRole(currentRole)) return forbidden('Only an approver or Admin can edit a requisition');
    if (!requisitionId) return badRequest('Requisition ID is required');

    const req = await prisma.erpFuelRequisition.findUnique({ where: { id: requisitionId } });
    if (!req) return badRequest('Requisition not found');
    if (req.status === 'APPROVED' || req.status === 'REJECTED' || req.status === 'CANCELLED' || req.status === 'DISPENSED') {
      return badRequest('Cannot edit a requisition that is already approved, dispensed, rejected, or cancelled');
    }

    const { fuelType: ft, gasStation: gs, currentOdometer: co, driverName: dn, branch: br, destination: dest, litersRequested: lr, purpose: pur, vehicleId: vid } = body;

    const updated = await prisma.erpFuelRequisition.update({
      where: { id: requisitionId },
      data: {
        ...(vid && { vehicleId: vid }),
        ...(ft && { fuelType: ft }),
        ...(lr && { litersRequested: Number(lr) }),
        ...(pur && { purpose: pur }),
        ...(gs && { gasStation: gs }),
        ...(co !== undefined && { currentOdometer: Number(co) }),
        ...(dn && { driverName: dn }),
        ...(br && { branch: br }),
        ...(dest && { destination: dest }),
      }
    });

    return ok(updated);
  }

  if (action === 'cancel') {
    if (!isApproverRole(currentRole)) return forbidden('Only an approver or Admin can cancel a requisition');
    if (!requisitionId) return badRequest('Requisition ID is required');

    const req = await prisma.erpFuelRequisition.findUnique({ where: { id: requisitionId } });
    if (!req) return badRequest('Requisition not found');
    if (req.status === 'APPROVED' || req.status === 'DISPENSED') return badRequest('Cannot cancel a requisition that has already been approved or dispensed');
    if (req.status === 'REJECTED' || req.status === 'CANCELLED') return badRequest('Requisition is already rejected or cancelled');

    const reason = body.reason as string | undefined;

    const updated = await prisma.erpFuelRequisition.update({
      where: { id: requisitionId },
      data: {
        status: 'CANCELLED',
        approvedBy: currentUserName,
        ...(reason && { notes: reason })
      }
    });

    return ok(updated);
  }

  return badRequest('Unknown action');
}

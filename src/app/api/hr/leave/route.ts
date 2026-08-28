import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, created, getBody } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const sp = request.nextUrl.searchParams;
  const search = sp.get('search') || '';
  const status = sp.get('status');
  const leaveType = sp.get('leaveType');
  const staffId = sp.get('staffId');
  const dateFrom = sp.get('dateFrom');
  const dateTo = sp.get('dateTo');
  const page = parseInt(sp.get('page') || '1');
  const limit = parseInt(sp.get('limit') || '10');
  const skip = (page - 1) * limit;

  const where: any = {};
  if (staffId) where.staffId = staffId;
  if (status) where.status = status;
  if (leaveType) where.leaveType = leaveType;
  if (dateFrom || dateTo) {
    where.startDate = {};
    if (dateFrom) where.startDate.gte = new Date(dateFrom);
    if (dateTo) where.startDate.lte = new Date(dateTo);
  }
  if (search) {
    where.OR = [
      { staff: { firstName: { contains: search } } },
      { staff: { lastName: { contains: search } } },
      { staff: { employeeCode: { contains: search } } },
      { reason: { contains: search } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.hrLeave.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { staff: { select: { id: true, employeeCode: true, firstName: true, lastName: true, department: true, position: true, branchId: true } } },
    }),
    prisma.hrLeave.count({ where }),
  ]);
  return ok({ items, total, page, limit, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { staffId, leaveType, startDate, endDate, reason, contactAddress, commutedDays } = body;

  if (!staffId || !leaveType || !startDate || !endDate) return badRequest('Staff, leave type, start date and end date are required');

  const start = new Date(startDate as string);
  const end = new Date(endDate as string);
  const diffMs = end.getTime() - start.getTime();
  const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);

  const item = await prisma.hrLeave.create({
    data: {
      staffId: staffId as string,
      leaveType: leaveType as string,
      startDate: start,
      endDate: end,
      days,
      reason: (reason as string) || null,
      contactAddress: (contactAddress as string) || null,
      commutedDays: parseInt(commutedDays as string) || 0,
      commutationStatus: parseInt(commutedDays as string) > 0 ? 'pending' : 'none',
      status: 'pending',
    },
    include: { staff: { select: { employeeCode: true, firstName: true, lastName: true } } },
  });

  return created(item);
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { id: rawId, status, rejectionNote, commutationStatus } = body;

  if (!rawId) return badRequest('ID is required');
  const id = rawId as string;

  const leave = await prisma.hrLeave.findUnique({
    where: { id },
    include: { staff: { select: { id: true, branchId: true, position: true } } },
  });
  if (!leave) return badRequest('Leave not found');

  const userEmail = (session.user as any)?.email as string;
  const approverStaff = await prisma.hrStaff.findFirst({ where: { email: userEmail } });
  if (!approverStaff) return badRequest('Approver not found in HR staff');

  const approverPosition = (approverStaff.position || '').toLowerCase();
  const isBDM = approverPosition.includes('business development manager');
  const isOpsMgr = approverPosition.includes('operations manager');
  const isDirector = approverPosition.includes('director');

  const hasBranch = !!leave.staff.branchId;

  if (status === 'rejected') {
    const currentStatus = leave.status;
    if (currentStatus !== 'pending' && currentStatus !== 'bdm_approved' && currentStatus !== 'manager_approved') {
      return badRequest('Cannot reject leave in current status');
    }
  }

  if (status === 'bdm_approved') {
    if (!hasBranch) return badRequest('BDM approval not applicable for non-branch staff');
    if (leave.status !== 'pending') return badRequest('Can only move from Pending to BDM Approved');
    if (!isBDM) return badRequest('Only Business Development Manager can approve at this level');
  }

  if (status === 'manager_approved') {
    if (hasBranch) {
      if (leave.status !== 'bdm_approved') return badRequest('Can only move from BDM Approved to Ops Manager Approved');
    } else {
      if (leave.status !== 'pending') return badRequest('Can only move from Pending to Ops Manager Approved');
    }
    if (!isOpsMgr) return badRequest('Only Operations Manager can approve at this level');
  }

  if (status === 'approved') {
    if (leave.status !== 'manager_approved') return badRequest('Can only move from Ops Manager Approved to Fully Approved');
    if (!isDirector) return badRequest('Only Director can give final approval');
  }

  const data: any = {};
  if (status) {
    data.status = status;
    if (status === 'approved') {
      data.approvedBy = userEmail || 'unknown';
      data.approvedAt = new Date();
    }
    if (status === 'rejected') {
      data.rejectionNote = rejectionNote || null;
    }
  }
  if (commutationStatus) {
    data.commutationStatus = commutationStatus;
  }

  const item = await prisma.hrLeave.update({
    where: { id },
    data,
    include: { staff: { select: { employeeCode: true, firstName: true, lastName: true } } },
  });

  return ok(item);
}

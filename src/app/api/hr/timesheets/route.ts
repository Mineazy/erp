import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, created, getBody, getBranchFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const sp = request.nextUrl.searchParams;
  const search = sp.get('search') || '';
  const status = sp.get('status');
  const staffId = sp.get('staffId');
  const dateFrom = sp.get('dateFrom');
  const dateTo = sp.get('dateTo');

  const where: any = {};
  const branchFilter = getBranchFilter(session);
  if (branchFilter?.branchId) {
    where.staff = { branchId: branchFilter.branchId };
  }
  if (staffId) where.staffId = staffId;
  if (status) where.status = status;
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) where.date.lte = new Date(dateTo);
  }
  if (search) {
    where.OR = [
      { staff: { firstName: { contains: search } } },
      { staff: { lastName: { contains: search } } },
      { staff: { employeeCode: { contains: search } } },
    ];
  }

  const items = await prisma.hrTimesheet.findMany({
    where,
    orderBy: { date: 'desc' },
    include: { staff: { select: { id: true, employeeCode: true, firstName: true, lastName: true, department: true } } },
  });
  return ok(items);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { staffId, date, clockIn, clockOut, status, notes } = body;

  if (!staffId || !date) return badRequest('Staff and date are required');

  let hoursWorked = 0;
  if (clockIn && clockOut) {
    const inTime = new Date(clockIn as string);
    const outTime = new Date(clockOut as string);
    hoursWorked = Math.max(0, (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60));
  }

  const item = await prisma.hrTimesheet.create({
    data: {
      staffId: staffId as string,
      date: new Date(date as string),
      clockIn: clockIn ? new Date(clockIn as string) : null,
      clockOut: clockOut ? new Date(clockOut as string) : null,
      hoursWorked,
      status: (status as string) || 'present',
      notes: (notes as string) || null,
    },
    include: { staff: { select: { employeeCode: true, firstName: true, lastName: true } } },
  });

  return created(item);
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { id: rawId, clockIn, clockOut, overtimeHours, status, notes } = body;

  if (!rawId) return badRequest('ID is required');
  const id = rawId as string;

  const data: any = {};
  if (clockIn) data.clockIn = new Date(clockIn as string);
  if (clockOut) data.clockOut = new Date(clockOut as string);
  if (overtimeHours !== undefined) data.overtimeHours = parseFloat(overtimeHours as string);
  if (status) data.status = status as string;
  if (notes !== undefined) data.notes = notes as string;

  if (clockIn && clockOut) {
    const inTime = new Date(clockIn as string);
    const outTime = new Date(clockOut as string);
    data.hoursWorked = Math.max(0, (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60));
  }

  const item = await prisma.hrTimesheet.update({
    where: { id },
    data,
    include: { staff: { select: { employeeCode: true, firstName: true, lastName: true } } },
  });

  return ok(item);
}

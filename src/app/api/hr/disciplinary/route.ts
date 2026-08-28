import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, created, getBody, getBranchFilter, getNextSequence } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const sp = request.nextUrl.searchParams;
  const search = sp.get('search') || '';
  const status = sp.get('status');
  const warningLevel = sp.get('warningLevel');
  const staffId = sp.get('staffId');
  const upcoming = sp.get('upcoming');

  const where: any = {};
  const branchFilter = getBranchFilter(session);
  if (branchFilter?.branchId) {
    where.staff = { branchId: branchFilter.branchId };
  }
  if (staffId) where.staffId = staffId;
  if (status) where.status = status;
  if (warningLevel) where.warningLevel = warningLevel;
  if (search) {
    where.OR = [
      { staff: { firstName: { contains: search } } },
      { staff: { lastName: { contains: search } } },
      { staff: { employeeCode: { contains: search } } },
      { caseNumber: { contains: search } },
      { incidentType: { contains: search } },
      { description: { contains: search } },
    ];
  }
  if (upcoming === 'true') {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    where.nextHearingDate = { not: null, gte: now, lte: in7Days };
    where.status = { notIn: ['closed', 'resolved'] };
  }

  const items = await prisma.hrDisciplinary.findMany({
    where,
    orderBy: [{ nextHearingDate: 'asc' }, { createdAt: 'desc' }],
    include: {
      staff: { select: { id: true, employeeCode: true, firstName: true, lastName: true, department: true, position: true, branchId: true } },
      hearings: { orderBy: { hearingDate: 'desc' } },
    },
  });
  return ok(items);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { staffId, incidentType, incidentDate, incidentLocation, description, witnesses, reportedBy } = body;

  if (!staffId || !incidentType || !incidentDate || !description) {
    return badRequest('Staff, incident type, date and description are required');
  }

  const caseNumber = await getNextSequence(prisma as any, 'hrDisciplinary', 'caseNumber', 'DISC');

  const item = await prisma.hrDisciplinary.create({
    data: {
      caseNumber: caseNumber as string,
      staffId: staffId as string,
      incidentType: incidentType as string,
      incidentDate: new Date(incidentDate as string),
      incidentLocation: (incidentLocation as string) || null,
      description: description as string,
      witnesses: (witnesses as string) || null,
      reportedBy: (reportedBy as string) || null,
      warningLevel: 'none',
      status: 'open',
    },
    include: {
      staff: { select: { employeeCode: true, firstName: true, lastName: true, department: true } },
    },
  });

  return created(item);
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { id: rawId, status, warningLevel, nextHearingDate, nextHearingTime, nextHearingVenue, hearingNotes, resolution } = body;

  if (!rawId) return badRequest('ID is required');
  const id = rawId as string;

  const data: any = {};
  if (status) data.status = status;
  if (warningLevel) data.warningLevel = warningLevel;
  if (nextHearingDate !== undefined) data.nextHearingDate = nextHearingDate ? new Date(nextHearingDate as string) : null;
  if (nextHearingTime !== undefined) data.nextHearingTime = (nextHearingTime as string) || null;
  if (nextHearingVenue !== undefined) data.nextHearingVenue = (nextHearingVenue as string) || null;
  if (hearingNotes !== undefined) data.hearingNotes = (hearingNotes as string) || null;
  if (resolution !== undefined) data.resolution = (resolution as string) || null;
  if (status === 'resolved') data.resolvedAt = new Date();
  if (status === 'closed') data.closedAt = new Date();

  const item = await prisma.hrDisciplinary.update({
    where: { id },
    data,
    include: {
      staff: { select: { employeeCode: true, firstName: true, lastName: true, department: true, position: true } },
      hearings: { orderBy: { hearingDate: 'desc' } },
    },
  });

  return ok(item);
}

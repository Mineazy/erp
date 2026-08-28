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

  const where: any = {};
  const branchFilter = getBranchFilter(session);
  if (branchFilter?.branchId) {
    where.staff = { branchId: branchFilter.branchId };
  }
  if (staffId) where.staffId = staffId;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { staff: { firstName: { contains: search } } },
      { staff: { lastName: { contains: search } } },
      { staff: { employeeCode: { contains: search } } },
      { loanType: { contains: search } },
      { reason: { contains: search } },
    ];
  }

  const items = await prisma.hrLoan.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { staff: { select: { id: true, employeeCode: true, firstName: true, lastName: true, department: true, basicSalary: true } } },
  });
  return ok(items);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { staffId, loanType, amount, monthlyDeduction, startDate, endDate, reason } = body;

  if (!staffId || !loanType || !amount || !startDate) return badRequest('Staff, loan type, amount and start date are required');

  const item = await prisma.hrLoan.create({
    data: {
      staffId: staffId as string,
      loanType: loanType as string,
      amount: parseFloat(amount as string),
      monthlyDeduction: parseFloat(monthlyDeduction as string) || 0,
      outstandingBalance: parseFloat(amount as string),
      startDate: new Date(startDate as string),
      endDate: endDate ? new Date(endDate as string) : null,
      reason: (reason as string) || null,
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
  const { id: rawId, status, rejectionNote, monthlyDeduction } = body;

  if (!rawId || !status) return badRequest('ID and status are required');
  const id = rawId as string;

  const data: any = { status };
  if (status === 'approved') {
    data.approvedBy = (session.user as any)?.email || 'unknown';
    data.approvedAt = new Date();
  }
  if (status === 'rejected') {
    data.rejectionNote = rejectionNote || null;
  }
  if (monthlyDeduction !== undefined) {
    data.monthlyDeduction = parseFloat(monthlyDeduction as string);
  }

  const item = await prisma.hrLoan.update({
    where: { id },
    data,
    include: { staff: { select: { employeeCode: true, firstName: true, lastName: true } } },
  });

  return ok(item);
}

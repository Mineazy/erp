import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, created, getBody, getNextSequence } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const sp = request.nextUrl.searchParams;
  const search = sp.get('search') || '';
  const status = sp.get('status');
  const department = sp.get('department');
  const branchId = sp.get('branchId');

  const where: any = {};
  if (branchId) where.branchId = branchId;

  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { employeeCode: { contains: search } },
      { email: { contains: search } },
      { position: { contains: search } },
    ];
  }
  if (status === 'active') where.isActive = true;
  else if (status === 'inactive') where.isActive = false;
  if (department) where.department = department;

  const items = await prisma.hrStaff.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { manager: { select: { firstName: true, lastName: true } } },
  });
  return ok(items);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { firstName, lastName, email, phone, nationalId, dateOfBirth, gender, maritalStatus, address, city, emergencyContact, emergencyPhone, department, position, employmentType, hireDate, branchId, managerId, basicSalary, bankName, bankAccount, notes } = body;

  if (!firstName || !lastName) return badRequest('First name and last name are required');
  if (!email) return badRequest('Email is required');

  const employeeCode = await getNextSequence(prisma, 'hrStaff', 'employeeCode', 'EMP');

  try {
    const item = await prisma.hrStaff.create({
      data: {
        employeeCode,
        firstName: firstName as string,
        lastName: lastName as string,
        email: email as string,
        phone: (phone as string) || null,
        nationalId: (nationalId as string) || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth as string) : null,
        gender: (gender as string) || null,
        maritalStatus: (maritalStatus as string) || null,
        address: (address as string) || null,
        city: (city as string) || null,
        emergencyContact: (emergencyContact as string) || null,
        emergencyPhone: (emergencyPhone as string) || null,
        department: (department as string) || null,
        position: (position as string) || null,
        employmentType: (employmentType as string) || 'full_time',
        hireDate: new Date((hireDate as string) || Date.now().toString()),
        branchId: (branchId as string) || (session.user as any)?.branchId || null,
        managerId: (managerId as string) || null,
        basicSalary: parseFloat(basicSalary as string) || 0,
        bankName: (bankName as string) || null,
        bankAccount: (bankAccount as string) || null,
        notes: (notes as string) || null,
      },
    });
    return created(item);
  } catch (e: any) {
    if (e?.code === 'P2002') {
      const field = e?.meta?.target?.[0] || 'field';
      return badRequest(`A record with this ${field} already exists`);
    }
    return badRequest(e?.message || 'Failed to create staff');
  }
}

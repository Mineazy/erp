import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, badRequest, getBody } from '@/lib/api';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const item = await prisma.hrStaff.findUnique({
    where: { id },
    include: { manager: { select: { firstName: true, lastName: true } } },
  });
  if (!item) return notFound();
  return ok(item);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const body = await getBody(request);
  const { firstName, lastName, email, phone, nationalId, dateOfBirth, gender, maritalStatus, address, city, emergencyContact, emergencyPhone, department, position, employmentType, hireDate, branchId, managerId, basicSalary, bankName, bankAccount, isActive, notes } = body;

  const data: any = {};
  if (firstName !== undefined) data.firstName = firstName;
  if (lastName !== undefined) data.lastName = lastName;
  if (email !== undefined) data.email = email;
  if (phone !== undefined) data.phone = phone || null;
  if (nationalId !== undefined) data.nationalId = nationalId || null;
  if (dateOfBirth !== undefined) data.dateOfBirth = dateOfBirth ? new Date(dateOfBirth as string) : null;
  if (gender !== undefined) data.gender = gender || null;
  if (maritalStatus !== undefined) data.maritalStatus = maritalStatus || null;
  if (address !== undefined) data.address = address || null;
  if (city !== undefined) data.city = city || null;
  if (emergencyContact !== undefined) data.emergencyContact = emergencyContact || null;
  if (emergencyPhone !== undefined) data.emergencyPhone = emergencyPhone || null;
  if (department !== undefined) data.department = department || null;
  if (position !== undefined) data.position = position || null;
  if (employmentType !== undefined) data.employmentType = employmentType;
  if (hireDate !== undefined) data.hireDate = new Date(hireDate as string);
  if (branchId !== undefined) data.branchId = branchId || null;
  if (managerId !== undefined) data.managerId = managerId || null;
  if (basicSalary !== undefined) data.basicSalary = parseFloat(basicSalary as string) || 0;
  if (bankName !== undefined) data.bankName = bankName || null;
  if (bankAccount !== undefined) data.bankAccount = bankAccount || null;
  if (isActive !== undefined) data.isActive = isActive;
  if (notes !== undefined) data.notes = notes || null;

  try {
    const item = await prisma.hrStaff.update({ where: { id }, data });
    return ok(item);
  } catch (e: any) {
    if (e?.code === 'P2002') {
      const field = e?.meta?.target?.[0] || 'field';
      return badRequest(`A record with this ${field} already exists`);
    }
    return notFound();
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  try {
    await prisma.hrStaff.delete({ where: { id } });
    return ok({ deleted: true });
  } catch {
    return notFound();
  }
}

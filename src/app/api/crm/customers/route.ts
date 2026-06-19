import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, badRequest, ok, created, getBody, getNextSequence, getBranchFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status');

  const branchFilter = getBranchFilter(session);
  const where: any = {};
  Object.assign(where, branchFilter);
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } },
      { contactPerson: { contains: search } },
      { email: { contains: search } },
    ];
  }
  if (status === 'active') where.isActive = true;
  else if (status === 'inactive') where.isActive = false;

  const items = await prisma.erpCustomer.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return ok(items);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { name, type, contactPerson, email, phone, mobile, address, city, country, taxId, creditLimit, notes } = body;

  if (!name) return badRequest('Name is required');

  const code = await getNextSequence(prisma, 'erpCustomer', 'code', 'CUS');

  const item = await prisma.erpCustomer.create({
    data: {
      code,
      name: name as string,
      type: (type as string) || 'company',
      contactPerson: contactPerson as string,
      email: email as string,
      phone: phone as string,
      mobile: mobile as string,
      address: address as string,
      city: city as string,
      country: country as string,
      taxId: taxId as string,
      creditLimit: parseFloat((creditLimit as string) || '0'),
      notes: notes as string,
      branchId: (session.user as any)?.branchId || null,
    },
  });
  return created(item);
}

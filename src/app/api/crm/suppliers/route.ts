import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, badRequest, ok, created, getBody, getNextSequence } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status');

  const where: any = {};
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

  const items = await prisma.erpSupplier.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return ok(items);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { name, contactPerson, email, phone, address, city, country, taxId, paymentTerms, notes } = body;

  if (!name) return badRequest('Name is required');

  const code = await getNextSequence(prisma, 'erpSupplier', 'code', 'SUP');

  const item = await prisma.erpSupplier.create({
    data: {
      code,
      name: name as string,
      contactPerson: contactPerson as string,
      email: email as string,
      phone: phone as string,
      address: address as string,
      city: city as string,
      country: country as string,
      taxId: taxId as string,
      paymentTerms: paymentTerms as string,
      notes: notes as string,
    },
  });
  return created(item);
}

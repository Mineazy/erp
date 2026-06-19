import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, created, getBody, getNextSequence, getBranchFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';

  const branchFilter = getBranchFilter(session);
  const where: any = {};
  Object.assign(where, branchFilter);
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } },
      { email: { contains: search } },
      { contactPerson: { contains: search } },
    ];
  }

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
  const { name, contactPerson, email, phone, city, paymentTerms, category, itf263Status, performanceScore, blacklisted } = body;

  if (!name) return badRequest('Name is required');

  const code = await getNextSequence(prisma, 'erpSupplier', 'code', 'SUP');

  const item = await prisma.erpSupplier.create({
    data: {
      code,
      name: name as string,
      contactPerson: contactPerson as string,
      email: email as string,
      phone: phone as string,
      city: city as string,
      paymentTerms: (paymentTerms as string) || 'Net 30',
      category: (category as string) || 'raw_materials',
      itf263Status: (itf263Status as string) || 'pending',
      performanceScore: performanceScore !== undefined ? parseInt(performanceScore as string) : 0,
      blacklisted: blacklisted === true,
      branchId: (session.user as any)?.branchId || null,
    },
  });
  return created(item);
}

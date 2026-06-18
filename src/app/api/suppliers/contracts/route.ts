import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, badRequest, ok, created, getBody, getNextSequence } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const supplierId = searchParams.get('supplierId');

  const where: any = {};
  if (supplierId) where.supplierId = supplierId;

  const items = await prisma.erpSupplierContract.findMany({
    where,
    include: { supplier: true },
    orderBy: { createdAt: 'desc' },
  });
  return ok(items);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { supplierId, title, startDate, endDate, value, currency, status, terms, docUrl } = body;

  if (!supplierId) return badRequest('Supplier is required');
  if (!title) return badRequest('Title is required');
  if (!startDate) return badRequest('Start date is required');
  if (!endDate) return badRequest('End date is required');
  if (value === undefined || value === null) return badRequest('Value is required');

  const supplier = await prisma.erpSupplier.findUnique({ where: { id: supplierId as string } });
  if (!supplier) return badRequest('Supplier not found');

  const contractNo = await getNextSequence(prisma, 'erpSupplierContract', 'contractNo', 'CTR');

  const item = await prisma.erpSupplierContract.create({
    data: {
      supplierId: supplierId as string,
      contractNo,
      title: title as string,
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
      value: parseFloat(value as string) || 0,
      currency: (currency as string) || 'USD',
      status: (status as string) || 'active',
      terms: terms as string,
      docUrl: docUrl as string,
    },
    include: { supplier: true },
  });
  return created(item);
}

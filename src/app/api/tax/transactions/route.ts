import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, created, ok, getBody, getBranchFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const referenceType = searchParams.get('referenceType');

  const branchFilter = getBranchFilter(session);
  const where: any = {};
  if (referenceType) where.referenceType = referenceType;
  Object.assign(where, branchFilter);

  const items = await prisma.taxTransaction.findMany({
    where,
    include: { taxType: true, branch: { select: { id: true, code: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return ok(items);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { reference, referenceType, taxTypeId, taxableAmount, rate, currency, exchangeRate } = body;
  if (!reference) return badRequest('Reference is required');
  if (!referenceType) return badRequest('Reference type is required');
  if (!taxTypeId) return badRequest('Tax type is required');
  if (taxableAmount === undefined || taxableAmount === null) return badRequest('Taxable amount is required');
  if (rate === undefined || rate === null) return badRequest('Rate is required');

  const taxAmount = (parseFloat(taxableAmount as string) * parseFloat(rate as string)) / 100;

  const item = await prisma.taxTransaction.create({
    data: {
      reference: reference as string,
      referenceType: referenceType as string,
      taxTypeId: taxTypeId as string,
      taxableAmount: parseFloat(taxableAmount as string),
      taxAmount,
      rate: parseFloat(rate as string),
      currency: (currency as string) || 'USD',
      exchangeRate: parseFloat((exchangeRate as string) || '1'),
      branchId: (session.user as any)?.branchId || null,
    },
  });
  return created(item);
}

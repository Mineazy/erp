import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, created, getBody, getNextSequence, getBranchFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const supplierId = searchParams.get('supplierId');
  const status = searchParams.get('status');

  const branchFilter = getBranchFilter(session);
  const where: any = {};
  Object.assign(where, branchFilter);
  if (supplierId) where.supplierId = supplierId;
  if (status) where.status = status;

  const items = await prisma.erpAccountPayable.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return ok(items);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { supplierId, supplierName, billDate, dueDate, amount, currency, description } = body;

  if (!supplierName || amount === undefined || amount === null) return badRequest('Supplier name and amount are required');

  const billNumber = await getNextSequence(prisma, 'erpAccountPayable', 'billNumber', 'BILL');
  const finalSupplierId = (supplierId as string) || `SUP-${(supplierName as string).replace(/[^a-zA-Z0-9]/g, '-').toUpperCase().replace(/-+/g, '-').replace(/^-|-$/g, '')}`;

  const item = await prisma.erpAccountPayable.create({
    data: {
      billNumber,
      supplierId: finalSupplierId,
      supplierName: supplierName as string,
      billDate: new Date(billDate as string),
      dueDate: new Date(dueDate as string),
      amount: parseFloat(amount as string),
      balance: parseFloat(amount as string),
      currency: (currency as string) || 'USD',
      description: description as string,
      branchId: (session.user as any)?.branchId || null,
    },
  });
  return created(item);
}

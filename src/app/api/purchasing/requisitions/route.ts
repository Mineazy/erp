import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, badRequest, ok, created, getBody, getNextSequence } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status');
  const department = searchParams.get('department');

  const where: any = {};
  if (search) {
    where.OR = [
      { requisitionNo: { contains: search } },
      { requestedBy: { contains: search } },
      { department: { contains: search } },
    ];
  }
  if (status) where.status = status;
  if (department) where.department = department;

  const items = await prisma.erpPurchaseRequisition.findMany({
    where,
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  return ok(items);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { requestedBy, department, requiredDate, notes, items } = body;

  if (!requestedBy) return badRequest('Requested by is required');
  if (!department) return badRequest('Department is required');
  if (!requiredDate) return badRequest('Required date is required');

  const requisitionNo = await getNextSequence(prisma, 'erpPurchaseRequisition', 'requisitionNo', 'REQ');

  const item = await prisma.erpPurchaseRequisition.create({
    data: {
      requisitionNo,
      requestedBy: requestedBy as string,
      department: department as string,
      requiredDate: new Date(requiredDate as string),
      notes: notes as string,
      items: items
        ? {
            create: (items as any[]).map((it: any) => ({
              productId: it.productId as string,
              productName: it.productName as string,
              quantity: parseFloat(it.quantity as string) || 0,
              estimatedCost: parseFloat(it.estimatedCost as string) || 0,
              notes: it.notes as string,
            })),
          }
        : undefined,
    },
    include: { items: true },
  });
  return created(item);
}

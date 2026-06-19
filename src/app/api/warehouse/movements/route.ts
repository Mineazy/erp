import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, created, getBody, getNextSequence, getBranchFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const branchFilter = getBranchFilter(session);

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const type = searchParams.get('type');

  const where: any = {};
  Object.assign(where, branchFilter);
  if (search) {
    where.OR = [
      { movementNo: { contains: search } },
      { productName: { contains: search } },
      { referenceType: { contains: search } },
      { notes: { contains: search } },
    ];
  }
  if (type) where.type = type;

  const items = await prisma.erpStockMovement.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { branch: { select: { id: true, code: true, name: true } } },
  });
  return ok(items);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { type, productId, productName, quantity, fromWarehouseId, toWarehouseId, referenceType, referenceId, notes, userId } = body;

  if (!type || !productId || quantity === undefined || quantity === null) return badRequest('Type, product, and quantity are required');

  const movementNo = await getNextSequence(prisma, 'erpStockMovement', 'movementNo', 'MV');

  const item = await prisma.erpStockMovement.create({
    data: {
      movementNo,
      branchId: (session.user as any)?.branchId || null,
      type: type as string,
      productId: productId as string,
      productName: (productName as string) || '',
      quantity: quantity as string,
      fromWarehouseId: (fromWarehouseId as string) || null,
      toWarehouseId: (toWarehouseId as string) || null,
      referenceType: (referenceType as string) || '',
      referenceId: (referenceId as string) || '',
      notes: (notes as string) || '',
      userId: (userId as string) || '',
    },
  });
  return created(item);
}

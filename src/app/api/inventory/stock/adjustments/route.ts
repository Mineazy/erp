import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, created, ok, getBody, getNextSequence, parseListParams, getBranchFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const sp = parseListParams(request.nextUrl.searchParams);
  const search = sp.search;
  const adjustmentType = request.nextUrl.searchParams.get('adjustmentType');
  const sort = sp.sort || 'createdAt';
  const order = sp.order || 'desc';
  const page = sp.page || 1;
  const limit = sp.limit || 50;
  const branchFilter = getBranchFilter(session);
  const where: Record<string, unknown> = {};
  Object.assign(where, branchFilter);
  if (search) {
    where.OR = [
      { adjustmentNo: { contains: search } },
      { productName: { contains: search } },
      { reason: { contains: search } },
    ];
  }
  if (adjustmentType) where.adjustmentType = adjustmentType;

  const orderBy: Record<string, 'asc' | 'desc'> = {};
  orderBy[sort] = order;

  const [items, total] = await Promise.all([
    prisma.erpStockAdjustment.findMany({
      where,
      orderBy: orderBy as any,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.erpStockAdjustment.count({ where }),
  ]);

  return ok({ items, total, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { productId, productName, adjustmentType, quantity, reason, notes } = body;
  if (!productId || !productName || !adjustmentType || quantity === undefined) {
    return badRequest('productId, productName, adjustmentType, and quantity are required');
  }

  const product = await prisma.erpProduct.findUnique({ where: { id: productId as string } });
  if (!product) return badRequest('Product not found');

  const qty = parseFloat(quantity as string);
  if (isNaN(qty) || qty <= 0) return badRequest('Quantity must be a positive number');

  const userBranchId = (session.user as any)?.branchId;
  if (!userBranchId) return badRequest('User must be assigned to a branch to adjust stock');

  const reductionTypes = ['loss', 'damaged', 'expired', 'write_off'];
  const isReduction = reductionTypes.includes(adjustmentType as string);
  const isAddition = adjustmentType === 'addition' || adjustmentType === 'adjustment' || adjustmentType === 'return';

  const branchStock = await prisma.erpBranchStock.findUnique({
    where: { branchId_productId: { branchId: userBranchId, productId: productId as string } }
  });
  const currentStock = branchStock ? Number(branchStock.quantity) : 0;
  let newStock: number;
  if (isReduction) {
    newStock = Math.max(0, currentStock - qty);
  } else if (isAddition) {
    newStock = currentStock + qty;
  } else {
    return badRequest('Invalid adjustmentType');
  }

  const adjustmentNo = await getNextSequence(prisma, 'erpStockAdjustment', 'adjustmentNo', 'ADJ');

  const adjustment = await prisma.erpStockAdjustment.create({
    data: {
      adjustmentNo,
      productId: productId as string,
      productName: productName as string,
      adjustmentType: adjustmentType as string,
      quantity: qty,
      currentStock,
      newStock,
      reason: reason as string | undefined,
      notes: notes as string | undefined,
      userId: (session.user as any).email || 'unknown',
      branchId: userBranchId,
    },
  });

  await prisma.erpBranchStock.upsert({
    where: { branchId_productId: { branchId: userBranchId, productId: productId as string } },
    create: { branchId: userBranchId, productId: productId as string, quantity: newStock },
    update: { quantity: newStock },
  });

  const movementNo = await getNextSequence(prisma, 'erpStockMovement', 'movementNo', 'MOV');
  const movementType = isReduction ? 'out' : 'in';
  await prisma.erpStockMovement.create({
    data: {
      movementNo,
      type: movementType,
      productId: productId as string,
      productName: productName as string,
      quantity: qty,
      notes: `${adjustmentType}: ${reason || ''}`,
      referenceType: 'stock_adjustment',
      referenceId: adjustment.id,
      userId: (session.user as any).email || 'unknown',
      branchId: (session.user as any)?.branchId || null,
    },
  });

  await prisma.erpInventoryAuditLog.create({
    data: {
      action: 'create',
      entityType: 'stock_adjustment',
      entityId: adjustment.id,
      description: `Stock adjustment ${adjustmentNo}: ${adjustmentType} ${qty} of ${productName} (${currentStock} → ${newStock})`,
      changes: JSON.stringify({ adjustmentNo, productId, productName, adjustmentType, qty, currentStock, newStock }),
      userId: (session.user as any).email || 'unknown',
      userName: (session.user as any).name || null,
      branchId: (session.user as any)?.branchId || null,
    },
  });

  return created(adjustment);
}

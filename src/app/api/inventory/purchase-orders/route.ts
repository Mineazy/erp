import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, created, ok, getBody, getNextSequence, parseListParams, getBranchFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const sp = parseListParams(request.nextUrl.searchParams);
  const search = sp.search;
  const status = sp.status;
  const sort = sp.sort || 'createdAt';
  const order = sp.order || 'desc';
  const page = sp.page || 1;
  const limit = sp.limit || 50;
  const branchFilter = getBranchFilter(session);
  const where: Record<string, unknown> = {};
  Object.assign(where, branchFilter);
  if (search) {
    where.OR = [
      { poNumber: { contains: search } },
      { supplierName: { contains: search } },
      { supplierId: { contains: search } },
    ];
  }
  if (status) where.status = status;

  const orderBy: Record<string, 'asc' | 'desc'> = {};
  orderBy[sort] = order;

  const [items, total] = await Promise.all([
    prisma.erpPurchaseOrder.findMany({
      where,
      orderBy: orderBy as any,
      skip: (page - 1) * limit,
      take: limit,
      include: { lines: true },
    }),
    prisma.erpPurchaseOrder.count({ where }),
  ]);

  return ok({ items, total, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { supplierId, supplierName, orderDate, expectedDate, notes, taxAmount } = body;
  const lines = (body.lines || []) as any[];
  if (!supplierName) return badRequest('Supplier name is required');

  const poNumber = await getNextSequence(prisma, 'erpPurchaseOrder', 'poNumber', 'PO');
  const finalSupplierId = (supplierId as string) || `SUP-${(supplierName as string).replace(/[^a-zA-Z0-9]/g, '-').toUpperCase().replace(/-+/g, '-').replace(/^-|-$/g, '')}`;
  let subtotal = 0;
  const lineData = lines.map((l: any) => {
    const total = parseFloat(l.quantity) * parseFloat(l.unitPrice);
    subtotal += total;
    return {
      productId: l.productId,
      productName: l.productName,
      quantity: parseFloat(l.quantity),
      unitPrice: parseFloat(l.unitPrice),
      total,
    };
  });

  const tx = parseFloat((taxAmount as string) || '0');
  const total = subtotal + tx;

  const order = await prisma.erpPurchaseOrder.create({
    data: {
      poNumber,
      supplierId: finalSupplierId,
      supplierName: supplierName as string,
      orderDate: new Date(orderDate as string),
      expectedDate: expectedDate ? new Date(expectedDate as string) : null,
      subtotal,
      taxAmount: tx,
      total,
      notes: notes as string | undefined,
      branchId: (session.user as any)?.branchId || null,
      lines: lineData.length ? { create: lineData } : undefined,
    },
    include: { lines: true },
  });

  return created(order);
}

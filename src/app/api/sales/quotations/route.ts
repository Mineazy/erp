import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, created, getNextSequence, parseListParams, getBranchFilter } from '@/lib/api';

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
      { quoteNumber: { contains: search } },
      { customerName: { contains: search } },
    ];
  }
  if (status) where.status = status;

  const orderBy: Record<string, 'asc' | 'desc'> = {};
  orderBy[sort] = order;

  const [items, total] = await Promise.all([
    prisma.erpQuotation.findMany({
      where,
      orderBy: orderBy as any,
      skip: (page - 1) * limit,
      take: limit,
      include: { lines: true },
    }),
    prisma.erpQuotation.count({ where }),
  ]);

  return ok({ items, total, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await request.json();
  const { customerId, customerName, customerEmail, quoteDate, validUntil, notes, terms, taxAmount, discount } = body;
  const lines = (body.lines || []) as any[];

  if (!customerName) return badRequest('Customer name is required');
  if (!lines.length) return badRequest('At least one line item is required');

  const quoteNumber = await getNextSequence(prisma, 'erpQuotation', 'quoteNumber', 'QT');
  const finalCustomerId = (customerId as string) || `CUST-${(customerName as string).replace(/[^a-zA-Z0-9]/g, '-').toUpperCase().replace(/-+/g, '-').replace(/^-|-$/g, '')}`;

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
  const disc = parseFloat((discount as string) || '0');
  const total = subtotal + tx - disc;

  const quote = await prisma.erpQuotation.create({
    data: {
      quoteNumber,
      customerId: finalCustomerId,
      customerName: customerName as string,
      customerEmail: customerEmail as string || null,
      quoteDate: quoteDate ? new Date(quoteDate as string) : new Date(),
      validUntil: validUntil ? new Date(validUntil as string) : null,
      subtotal,
      taxAmount: tx,
      discount: disc,
      total,
      notes: notes as string || null,
      terms: terms as string || null,
      createdBy: (session.user as any)?.name || null,
      branchId: (session.user as any)?.branchId || null,
      lines: lineData.length ? { create: lineData } : undefined,
    },
    include: { lines: true },
  });

  return created(quote);
}

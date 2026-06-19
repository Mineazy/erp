import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, created, getBody, getNextSequence, getBranchFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  const branchFilter = getBranchFilter(session);
  const where: any = {};
  Object.assign(where, branchFilter);
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { returnNumber: { contains: search } },
      { customerName: { contains: search } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.erpReturn.findMany({
      where,
      include: { lines: true, branch: { select: { id: true, code: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.erpReturn.count({ where }),
  ]);

  return ok({ items, total });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { customerName, referenceType, referenceId, reason, notes, lines } = body;

  if (!lines || !Array.isArray(lines) || lines.length === 0) {
    return badRequest('At least one return line is required');
  }

  for (const l of lines) {
    if (!l.productId || !l.quantity || !l.unitPrice) {
      return badRequest('Each line must have productId, quantity, and unitPrice');
    }
  }

  const returnNumber = await getNextSequence(prisma, 'erpReturn', 'returnNumber', 'RET');
  let total = 0;
  const lineData = (lines as any[]).map((l: any) => {
    const qty = parseFloat(l.quantity);
    const price = parseFloat(l.unitPrice);
    const lineTotal = qty * price;
    total += lineTotal;
    return {
      productId: l.productId,
      productName: l.productName || '',
      quantity: qty,
      unitPrice: price,
      total: lineTotal,
      reason: l.reason || null,
      condition: l.condition || 'good',
    };
  });

  const ret = await prisma.erpReturn.create({
    data: {
      returnNumber,
      customerName: customerName as string || null,
      referenceType: (referenceType as string) || 'direct',
      referenceId: referenceId as string || null,
      reason: reason as string || null,
      notes: notes as string || null,
      total,
      createdBy: (session.user as any).email || 'unknown',
      branchId: (session.user as any)?.branchId || null,
      lines: { create: lineData },
    },
    include: { lines: true, branch: { select: { id: true, code: true, name: true } } },
  });

  return created(ret);
}

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok, getBranchFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const branchId = searchParams.get('branchId');
  const cashier = searchParams.get('cashier');
  const date = searchParams.get('date');
  
  const branchFilter = await getBranchFilter(session);

  const where: any = {
    cashDifference: { not: 0 },
    ...branchFilter,
  };

  if (branchId) {
    where.branchId = branchId;
  }
  
  if (cashier) {
    where.session = {
      openedBy: {
        contains: cashier,
      }
    };
  }

  if (date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    
    where.closedAt = {
      gte: startDate,
      lte: endDate,
    };
  }

  const [variances, total] = await Promise.all([
    prisma.erpZReport.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true, code: true } },
        session: { select: { openedBy: true } },
      },
      orderBy: { closedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.erpZReport.count({ where }),
  ]);

  return ok({
    data: variances,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

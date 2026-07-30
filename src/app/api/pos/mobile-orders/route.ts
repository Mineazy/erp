import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok, getBranchFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const branchFilter = getBranchFilter(session);

  const orders = await prisma.erpSalesOrder.findMany({
    where: {
      ...branchFilter,
      status: 'mobile_pending'
    },
    include: {
      lines: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return ok({ items: orders });
}

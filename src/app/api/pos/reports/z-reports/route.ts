import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok, getBranchFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const branchFilter = getBranchFilter(session);
  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const branchId = url.searchParams.get('branchId') || '';
  
  const where: any = {
    ...branchFilter,
    ...(branchId && { branchId }),
    ...(search && {
      OR: [
        { reportNumber: { contains: search } },
        { generatedBy: { contains: search } },
      ],
    }),
  };

  const skip = (page - 1) * limit;

  const [reports, total] = await Promise.all([
    prisma.erpZReport.findMany({
      where,
      orderBy: { generatedAt: 'desc' },
      include: {
        session: true,
        branch: { select: { id: true, name: true, code: true } }
      },
      skip,
      take: limit,
    }),
    prisma.erpZReport.count({ where })
  ]);

  return ok({ items: reports, total, page, limit, totalPages: Math.ceil(total / limit) });
}

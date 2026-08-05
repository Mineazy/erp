import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok, getBranchFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const branchFilter = getBranchFilter(session);
  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';
  
  const where: any = {
    ...branchFilter,
    ...(search && {
      OR: [
        { reportNumber: { contains: search } },
        { generatedBy: { contains: search } },
      ],
    }),
  };

  const reports = await prisma.erpZReport.findMany({
    where,
    orderBy: { generatedAt: 'desc' },
    include: {
      session: true,
      branch: { select: { id: true, name: true, code: true } }
    },
    take: 50,
  });

  return ok({ items: reports });
}

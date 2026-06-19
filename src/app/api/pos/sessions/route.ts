import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, created, ok, getBody, getNextSequence, getBranchFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status');

  const branchFilter = getBranchFilter(session);
  const where: Record<string, unknown> = {};
  Object.assign(where, branchFilter);
  if (status) where.status = status;

  const sessions = await prisma.erpPosSession.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { transactions: true } }, branch: { select: { id: true, code: true, name: true } } },
  });

  return ok(sessions);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { openingBalance, notes } = body;

  if (openingBalance === undefined) return badRequest('Opening balance is required');

  const sessionNumber = await getNextSequence(prisma, 'erpPosSession', 'sessionNumber', 'POS');

  const posSession = await prisma.erpPosSession.create({
    data: {
      sessionNumber,
      openedBy: (session.user as any).email || 'unknown',
      openingBalance: parseFloat(openingBalance as string),
      notes: notes as string | undefined,
      branchId: (session.user as any)?.branchId || null,
    },
  });

  return created(posSession);
}

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, badRequest, ok, getBody } from '@/lib/api';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const posSession = await prisma.erpPosSession.findUnique({
    where: { id: params.id },
    include: {
      transactions: {
        include: { lines: true, payments: true },
        orderBy: { createdAt: 'desc' },
      },
      _count: { select: { transactions: true } },
    },
  });

  if (!posSession) return notFound('POS session not found');
  return ok(posSession);
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpPosSession.findUnique({ where: { id: params.id } });
  if (!existing) return notFound('POS session not found');
  if (existing.status !== 'open') return badRequest('Session is already closed');

  const body = await getBody(request);
  const { closingBalance, notes } = body;

  if (closingBalance === undefined) return badRequest('Closing balance is required');

  const posSession = await prisma.erpPosSession.update({
    where: { id: params.id },
    data: {
      status: 'closed',
      closedAt: new Date(),
      closedBy: (session.user as any).email || 'unknown',
      closingBalance: parseFloat(closingBalance as string),
      ...(notes !== undefined && { notes: notes as string }),
    },
  });

  return ok(posSession);
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpPosSession.findUnique({ where: { id: params.id } });
  if (!existing) return notFound('POS session not found');

  await prisma.erpPosSession.delete({ where: { id: params.id } });
  return ok({ success: true });
}

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, badRequest, ok, getBody, getNextSequence } from '@/lib/api';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const transaction = await prisma.erpPosTransaction.findUnique({
    where: { id: id },
    include: { lines: true, payments: true, session: true },
  });

  if (!transaction) return notFound('Transaction not found');
  return ok(transaction);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpPosTransaction.findUnique({
    where: { id: id },
    include: { session: true },
  });
  if (!existing) return notFound('Transaction not found');
  if (existing.session.status !== 'open') return badRequest('Session is closed, cannot modify transaction');

  const body = await getBody(request);
  const { notes, status } = body;

  const transaction = await prisma.erpPosTransaction.update({
    where: { id: id },
    data: {
      ...(notes !== undefined && { notes: notes as string }),
      ...(status !== undefined && { status: status as string }),
    },
    include: { lines: true, payments: true },
  });

  return ok(transaction);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpPosTransaction.findUnique({
    where: { id: id },
    include: { lines: true, session: true },
  });
  if (!existing) return notFound('Transaction not found');
  if (existing.session.status !== 'open') return badRequest('Session is closed, cannot delete transaction');

  const userEmail = (session.user as any)?.email || 'unknown';

  for (const line of existing.lines) {
    await prisma.erpProduct.update({
      where: { id: line.productId },
      data: { stock: { increment: line.quantity } },
    });
    const movementNo = await getNextSequence(prisma, 'erpStockMovement', 'movementNo', 'MOV');
    await prisma.erpStockMovement.create({
      data: {
        movementNo,
        type: 'in',
        productId: line.productId,
        productName: line.productName,
        quantity: line.quantity,
        referenceType: 'pos_void',
        referenceId: id,
        userId: userEmail,
      },
    });
  }

  // Decrement session totalSales
  await prisma.erpPosSession.update({
    where: { id: existing.sessionId },
    data: { totalSales: { decrement: existing.total } },
  });

  await prisma.erpPosTransaction.delete({ where: { id: id } });
  return ok({ success: true });
}

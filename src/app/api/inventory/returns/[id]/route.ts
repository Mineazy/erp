import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, badRequest, ok, getBody, getNextSequence } from '@/lib/api';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const ret = await prisma.erpReturn.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!ret) return notFound('Return not found');
  return ok(ret);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpReturn.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!existing) return notFound('Return not found');

  const body = await getBody(request);
  const { status, reason, notes } = body;

  const updateData: any = {};
  if (status) updateData.status = status;
  if (reason !== undefined) updateData.reason = reason;
  if (notes !== undefined) updateData.notes = notes;

  const userEmail = (session.user as any)?.email || 'unknown';

  if (status === 'completed' && existing.status !== 'completed') {
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
          referenceType: 'return',
          referenceId: id,
          userId: userEmail,
        },
      });
    }
  }

  if (existing.status === 'completed' && status && status !== 'completed') {
    for (const line of existing.lines) {
      await prisma.erpProduct.update({
        where: { id: line.productId },
        data: { stock: { decrement: line.quantity } },
      });
      const movementNo = await getNextSequence(prisma, 'erpStockMovement', 'movementNo', 'MOV');
      await prisma.erpStockMovement.create({
        data: {
          movementNo,
          type: 'out',
          productId: line.productId,
          productName: line.productName,
          quantity: line.quantity,
          referenceType: 'return_reversal',
          referenceId: id,
          userId: userEmail,
        },
      });
    }
  }

  const ret = await prisma.erpReturn.update({
    where: { id },
    data: updateData,
    include: { lines: true },
  });

  return ok(ret);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpReturn.findUnique({ where: { id } });
  if (!existing) return notFound('Return not found');

  if (existing.status === 'completed') {
    const lines = await prisma.erpReturnLine.findMany({ where: { returnId: id } });
    const userEmail = (session.user as any)?.email || 'unknown';
    for (const line of lines) {
      await prisma.erpProduct.update({
        where: { id: line.productId },
        data: { stock: { decrement: line.quantity } },
      });
      const movementNo = await getNextSequence(prisma, 'erpStockMovement', 'movementNo', 'MOV');
      await prisma.erpStockMovement.create({
        data: {
          movementNo,
          type: 'out',
          productId: line.productId,
          productName: line.productName,
          quantity: line.quantity,
          referenceType: 'return_delete',
          referenceId: id,
          userId: userEmail,
        },
      });
    }
  }

  await prisma.erpReturn.delete({ where: { id } });
  return ok({ success: true });
}

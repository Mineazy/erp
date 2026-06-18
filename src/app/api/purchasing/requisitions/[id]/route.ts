import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody } from '@/lib/api';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const item = await prisma.erpPurchaseRequisition.findUnique({
    where: { id: id },
    include: { items: true },
  });
  if (!item) return notFound('Requisition not found');
  return ok(item);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpPurchaseRequisition.findUnique({ where: { id: id } });
  if (!existing) return notFound('Requisition not found');

  const body = await getBody(request);
  const { requestedBy, department, requiredDate, status, notes, approvedBy, approvedAt, items } = body;

  const data: Record<string, unknown> = {};
  if (requestedBy) data.requestedBy = requestedBy as string;
  if (department) data.department = department as string;
  if (requiredDate) data.requiredDate = new Date(requiredDate as string);
  if (status) data.status = status as string;
  if (notes !== undefined) data.notes = notes;
  if (approvedBy !== undefined) data.approvedBy = approvedBy;
  if (approvedAt !== undefined) data.approvedAt = approvedAt ? new Date(approvedAt as string) : null;

  const item = await prisma.erpPurchaseRequisition.update({
    where: { id: id },
    data: data as any,
    include: { items: true },
  });

  if (items) {
    await prisma.erpPurchaseRequisitionItem.deleteMany({ where: { requisitionId: id } });
    for (const it of items as any[]) {
      await prisma.erpPurchaseRequisitionItem.create({
        data: {
          requisitionId: id,
          productId: it.productId as string,
          productName: it.productName as string,
          quantity: parseFloat(it.quantity as string) || 0,
          estimatedCost: parseFloat(it.estimatedCost as string) || 0,
          notes: it.notes as string,
        },
      });
    }
  }

  const updated = await prisma.erpPurchaseRequisition.findUnique({
    where: { id: id },
    include: { items: true },
  });
  return ok(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpPurchaseRequisition.findUnique({ where: { id: id } });
  if (!existing) return notFound('Requisition not found');

  await prisma.erpPurchaseRequisition.delete({ where: { id: id } });
  return ok({ deleted: true });
}

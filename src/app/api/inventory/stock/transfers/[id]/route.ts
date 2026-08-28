import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, badRequest, getBody } from '@/lib/api';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const transfer = await prisma.erpStockTransfer.findUnique({
    where: { id },
    include: { lines: true, fromBranch: true, toBranch: true, fromWarehouse: true, toWarehouse: true },
  });
  if (!transfer) return notFound('Stock transfer not found');

  return ok(transfer);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpStockTransfer.findUnique({ where: { id }, include: { lines: true } });
  if (!existing) return notFound('Stock transfer not found');
  if (existing.status !== 'draft') return badRequest('Only draft orders can be edited');

  const body = await getBody(request);
  const { fromBranchId, toBranchId, fromWarehouseId, toWarehouseId, status, notes } = body;
  const lines = (body.lines || undefined) as any[] | undefined;

  await prisma.erpStockTransferLine.deleteMany({ where: { transferId: id } });

  const updateData: Record<string, unknown> = {};
  if (fromBranchId !== undefined) updateData.fromBranchId = fromBranchId;
  if (toBranchId !== undefined) updateData.toBranchId = toBranchId;
  if (fromWarehouseId !== undefined) updateData.fromWarehouseId = fromWarehouseId;
  if (toWarehouseId !== undefined) updateData.toWarehouseId = toWarehouseId;
  if (status !== undefined) updateData.status = status;
  if (notes !== undefined) updateData.notes = notes;
  if (lines) {
    updateData.lines = {
      create: lines.map((l: any) => ({
        productId: l.productId,
        productName: l.productName,
        productCode: l.productCode || null,
        quantity: parseFloat(l.quantity),
        batchNo: l.batchNo || null,
        unitPrice: parseFloat(l.unitPrice) || 0,
      })),
    };
  }

  const transfer = await prisma.erpStockTransfer.update({
    where: { id },
    data: updateData as any,
    include: { lines: true, fromBranch: true, toBranch: true, fromWarehouse: true, toWarehouse: true },
  });

  return ok(transfer);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpStockTransfer.findUnique({ where: { id } });
  if (!existing) return notFound('Stock transfer not found');

  await prisma.erpStockTransfer.delete({ where: { id } });
  return ok({ success: true });
}

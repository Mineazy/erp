import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, created, getNextSequence } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status');
  const poId = searchParams.get('poId');

  const where: any = {};
  if (search) {
    where.OR = [
      { receiptNo: { contains: search } },
      { supplierName: { contains: search } },
    ];
  }
  if (status) where.status = status;
  if (poId) where.poId = poId;

  const items = await prisma.erpGoodsReceipt.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      po: { select: { poNumber: true, supplierName: true } },
      lines: true,
    },
  });

  return ok(items);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await request.json();
  const { poId, supplierId, supplierName, receivedAt, notes, inspectedBy, inspectionStatus, lines } = body;

  if (!lines || !Array.isArray(lines) || lines.length === 0) {
    return badRequest('At least one line item is required');
  }

  if (!poId) return badRequest('Purchase order reference is required');

  const po = await prisma.erpPurchaseOrder.findUnique({ where: { id: poId } });
  if (!po) return badRequest('Purchase order not found');

  const receiptNo = await getNextSequence(prisma, 'erpGoodsReceipt', 'receiptNo', 'GRV');

  const receipt = await prisma.erpGoodsReceipt.create({
    data: {
      receiptNo,
      poId,
      supplierId: supplierId || po.supplierId,
      supplierName: supplierName || po.supplierName,
      receivedAt: receivedAt ? new Date(receivedAt as string) : new Date(),
      notes: notes as string,
      inspectedBy: inspectedBy as string,
      inspectionStatus: inspectionStatus as string || 'pending',
      branchId: (session.user as any)?.branchId || null,
      lines: {
        create: (lines as any[]).map((line: any) => ({
          productId: line.productId,
          productName: line.productName,
          poLineId: line.poLineId || '',
          quantity: parseFloat(line.quantity) || 0,
          batchNo: line.batchNo || null,
          serialNo: line.serialNo || null,
          location: line.location || null,
        })),
      },
    },
    include: { lines: true, po: { select: { poNumber: true, supplierName: true } } },
  });

  for (const line of (lines as any[])) {
    await prisma.erpProduct.update({
      where: { id: line.productId },
      data: { stock: { increment: parseFloat(line.quantity) || 0 } },
    });
  }

  return created(receipt);
}

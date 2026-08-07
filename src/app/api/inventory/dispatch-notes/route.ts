import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, created, getNextSequence } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status');
  const salesOrderId = searchParams.get('salesOrderId');

  const where: any = {};
  if (search) {
    where.OR = [
      { dispatchNo: { contains: search } },
      { customerName: { contains: search } },
    ];
  }
  if (status) where.status = status;
  if (salesOrderId) where.salesOrderId = salesOrderId;

  const items = await prisma.erpDispatchNote.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      lines: true,
    },
  });

  return ok(items);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await request.json();
  const { salesOrderId, customerId, customerName, dispatchDate, vehicleNo, driverName, deliveryAddress, notes, lines } = body;

  if (!lines || !Array.isArray(lines) || lines.length === 0) {
    return badRequest('At least one line item is required');
  }

  const dispatchNo = await getNextSequence(prisma, 'erpDispatchNote', 'dispatchNo', 'DSP');

  const dispatch = await prisma.erpDispatchNote.create({
    data: {
      dispatchNo,
      salesOrderId: salesOrderId as string || null,
      customerId: customerId as string || null,
      customerName: customerName as string,
      dispatchDate: dispatchDate ? new Date(dispatchDate as string) : new Date(),
      vehicleNo: vehicleNo as string,
      driverName: driverName as string,
      deliveryAddress: deliveryAddress as string,
      notes: notes as string,
      createdBy: (session.user as any)?.name || null,
      branchId: (session.user as any)?.branchId || null,
      lines: {
        create: (lines as any[]).map((line: any) => ({
          productId: line.productId,
          productName: line.productName,
          quantity: parseFloat(line.quantity) || 0,
          unitPrice: parseFloat(line.unitPrice) || 0,
          batchNo: line.batchNo || null,
        })),
      },
    },
    include: { lines: true },
  });

  if (salesOrderId) {
    const salesOrder = await prisma.erpSalesOrder.findUnique({ where: { id: salesOrderId as string } });
    if (salesOrder && salesOrder.status === 'confirmed') {
      await prisma.erpSalesOrder.update({
        where: { id: salesOrderId as string },
        data: { status: 'dispatched' },
      });
    }
  }

  if (dispatch.branchId) {
    for (const line of (lines as any[])) {
      await prisma.erpBranchStock.upsert({
        where: { branchId_productId: { branchId: dispatch.branchId, productId: line.productId } },
        create: { branchId: dispatch.branchId, productId: line.productId, quantity: -(parseFloat(line.quantity) || 0) },
        update: { quantity: { decrement: parseFloat(line.quantity) || 0 } },
      });
    }
  }

  return created(dispatch);
}

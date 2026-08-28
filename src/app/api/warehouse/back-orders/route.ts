import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok, badRequest, getBody, getNextSequence, getBranchFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const sp = request.nextUrl.searchParams;
  const search = sp.get('search') || '';
  const stage = sp.get('stage');
  const status = sp.get('status');

  const where: any = {};
  const branchFilter = getBranchFilter(session);
  if (branchFilter?.branchId) where.branchId = branchFilter.branchId;
  if (stage) where.stage = stage;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { orderNumber: { contains: search } },
      { branch: { name: { contains: search } } },
      { customerName: { contains: search } },
    ];
  }

  const orders = await prisma.erpBackOrder.findMany({
    where,
    include: {
      branch: { select: { name: true } },
      lines: true,
      activities: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: [{ createdAt: 'desc' }],
  });
  return ok(orders);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body: any = await getBody(request);
  const { branchId, customerName, customerRef, urgency, targetDate, notes, items } = body;

  if (!branchId || !items?.length) return badRequest('Branch and items are required');

  const orderNumber = await getNextSequence(prisma as any, 'erpBackOrder', 'orderNumber', 'BO');
  const userEmail = (session.user as any)?.email || 'unknown';

  const order = await prisma.erpBackOrder.create({
    data: {
      orderNumber: orderNumber as string,
      branchId: branchId as string,
      requestedBy: userEmail,
      customerName: (customerName as string) || null,
      customerRef: (customerRef as string) || null,
      urgency: (urgency as string) || 'normal',
      targetDate: targetDate ? new Date(targetDate as string) : null,
      notes: (notes as string) || null,
      status: 'submitted',
      stage: 'submitted',
      lines: {
        create: items.map((item: any) => ({
          productId: item.productId,
          productName: item.productName,
          requestedQty: parseFloat(item.requestedQty),
          outstandingQty: parseFloat(item.requestedQty),
          allocatedQty: 0,
          purchasedQty: 0,
          receivedQty: 0,
          status: 'pending',
        })),
      },
    },
    include: { lines: true },
  });

  await prisma.erpBackOrderActivity.create({
    data: {
      backOrderId: order.id,
      action: 'created',
      toStage: 'submitted',
      performedBy: userEmail,
      notes: 'Back order created',
    },
  });

  return ok(order);
}

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok, badRequest, getBody, getNextSequence, getBranchFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const sp = request.nextUrl.searchParams;
  const search = sp.get('search') || '';
  const status = sp.get('status');
  const branchId = sp.get('branchId');

  const where: any = {};
  const branchFilter = getBranchFilter(session);
  if (branchFilter?.branchId) where.branchId = branchFilter.branchId;
  else if (branchId) where.branchId = branchId;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { jobCardNumber: { contains: search } },
      { customerName: { contains: search } },
      { productName: { contains: search } },
      { serialNumber: { contains: search } },
      { branch: { name: { contains: search } } },
    ];
  }

  const items = await prisma.erpRepairJobCard.findMany({
    where,
    include: {
      branch: { select: { name: true } },
      activities: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: [{ createdAt: 'desc' }],
  });
  return ok(items);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body: any = await getBody(request);
  const { branchId, customerName, customerContact, productName, productCode, serialNumber, faultDescription, priority, assignedTechnician, receivedDate, notes } = body;

  if (!branchId || !customerName || !productName || !faultDescription) {
    return badRequest('Branch, customer name, product name, and fault description are required');
  }

  const jobCardNumber = await getNextSequence(prisma as any, 'erpRepairJobCard', 'jobCardNumber', 'RC');
  const userEmail = (session.user as any)?.email || 'unknown';

  const card = await prisma.erpRepairJobCard.create({
    data: {
      jobCardNumber: jobCardNumber as string,
      branchId,
      customerName,
      customerContact: customerContact || null,
      productName,
      productCode: productCode || null,
      serialNumber: serialNumber || null,
      faultDescription,
      priority: priority || 'medium',
      assignedTechnician: assignedTechnician || null,
      receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
      status: 'open',
      notes: notes || null,
    },
  });

  await prisma.erpRepairActivity.create({
    data: {
      jobCardId: card.id,
      action: 'created',
      toStatus: 'open',
      performedBy: userEmail,
      notes: 'Job card opened for returned equipment',
    },
  });

  return ok(card);
}

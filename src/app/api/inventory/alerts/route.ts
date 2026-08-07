import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, created, ok, getBody, parseListParams, getBranchFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const sp = parseListParams(request.nextUrl.searchParams);
  const type = request.nextUrl.searchParams.get('type');
  const severity = request.nextUrl.searchParams.get('severity');
  const isRead = request.nextUrl.searchParams.get('isRead');
  const sort = sp.sort || 'createdAt';
  const order = sp.order || 'desc';
  const page = sp.page || 1;
  const limit = sp.limit || 50;
  const branchFilter = getBranchFilter(session);
  const where: Record<string, unknown> = {};
  Object.assign(where, branchFilter);
  if (type) where.type = type;
  if (severity) where.severity = severity;
  if (isRead !== null) where.isRead = isRead === 'true';

  const orderBy: Record<string, 'asc' | 'desc'> = {};
  orderBy[sort] = order;

  const [items, total] = await Promise.all([
    prisma.erpAlert.findMany({
      where,
      orderBy: orderBy as any,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.erpAlert.count({ where }),
  ]);

  return ok({ items, total, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { type, title, message, severity, referenceType, referenceId, userId, branchId } = body;
  if (!type || !title || !message) return badRequest('type, title, and message are required');

  const alert = await prisma.erpAlert.create({
    data: {
      type: type as string,
      title: title as string,
      message: message as string,
      severity: (severity as string) || 'info',
      referenceType: referenceType as string | undefined,
      referenceId: referenceId as string | undefined,
      userId: (userId as string) || (session.user as any).email || null,
      branchId: (branchId as string) || (session.user as any)?.branchId || null,
    },
  });

  if (type === 'low_stock') {
    const alertBranchId = alert.branchId;
    const where: Record<string, unknown> = { product: { isActive: true }, quantity: { lte: prisma.erpBranchStock.fields.minQuantity as any } };
    if (alertBranchId) where.branchId = alertBranchId;
    const lowStockProducts = await prisma.erpBranchStock.findMany({ where, include: { product: true } });

    for (const p of lowStockProducts) {
      await prisma.erpAlert.create({
        data: {
          type: 'low_stock',
          title: `Low Stock: ${p.product.name}`,
          message: `${p.product.name} is running low. Current stock: ${p.quantity}, Min required: ${p.minQuantity}`,
          severity: 'warning',
          referenceType: 'product',
          referenceId: p.productId,
          userId: alert.userId,
          branchId: alertBranchId,
        },
      });
    }
  }

  return created(alert);
}

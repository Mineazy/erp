import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, created, ok, getBody } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');

  const where: any = {};

  if (type === 'saved') {
    if (searchParams.get('reportType')) {
      where.type = searchParams.get('reportType');
    }
    const [items, total] = await Promise.all([
      prisma.savedReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.savedReport.count({ where }),
    ]);
    return ok({ items, total, page, limit });
  }

  if (type === 'audit') {
    const entityType = searchParams.get('entityType');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    if (entityType) where.entityType = entityType;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);
    return ok({ items, total, page, limit });
  }

  if (type === 'tax') {
    const category = searchParams.get('category');
    if (category) where.category = category;
    const [items, total] = await Promise.all([
      prisma.taxType.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.taxType.count({ where }),
    ]);
    return ok({ items, total, page, limit });
  }

  if (type === 'transactions') {
    const referenceType = searchParams.get('referenceType');
    if (referenceType) where.referenceType = referenceType;
    const [items, total] = await Promise.all([
      prisma.taxTransaction.findMany({
        where,
        include: { taxType: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.taxTransaction.count({ where }),
    ]);
    return ok({ items, total, page, limit });
  }

  if (type === 'fdms') {
    const status = searchParams.get('status');
    if (status) where.status = status;
    const [items, total] = await Promise.all([
      prisma.fiscalisedDocument.findMany({
        where,
        include: { device: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.fiscalisedDocument.count({ where }),
    ]);
    return ok({ items, total, page, limit });
  }

  return ok({ items: [], total: 0, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { name, type, config, isPublic } = body;
  if (!name) return badRequest('Name is required');
  if (!type) return badRequest('Type is required');
  if (!config) return badRequest('Config is required');

  const item = await prisma.savedReport.create({
    data: {
      name: name as string,
      type: type as string,
      config: config as object,
      createdBy: (session.user as { id: string }).id,
      isPublic: isPublic !== undefined ? Boolean(isPublic) : false,
    },
  });
  return created(item);
}

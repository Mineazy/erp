import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, created, ok, getBody, getNextSequence, parseListParams, getBranchFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const sp = parseListParams(request.nextUrl.searchParams);
  const search = sp.search;
  const sort = sp.sort || 'createdAt';
  const order = sp.order || 'desc';
  const page = sp.page || 1;
  const limit = sp.limit || 50;
  const status = request.nextUrl.searchParams.get('status');
  const categoryId = request.nextUrl.searchParams.get('categoryId');
  const branchFilter = getBranchFilter(session);

  const where: Record<string, unknown> = {};
  Object.assign(where, branchFilter);

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { assetNo: { contains: search } },
      { serialNo: { contains: search } },
      { description: { contains: search } },
    ];
  }

  if (status) where.status = status;
  if (categoryId) where.categoryId = categoryId;

  const orderBy: Record<string, 'asc' | 'desc'> = {};
  orderBy[sort] = order;

  const [items, total] = await Promise.all([
    prisma.erpAsset.findMany({
      where,
      include: { category: true, branch: true },
      orderBy: orderBy as any,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.erpAsset.count({ where }),
  ]);

  return ok({ items, total, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const {
    categoryId,
    name,
    description,
    model,
    serialNo,
    manufacturer,
    location,
    purchaseDate,
    purchaseCost,
    salvageValue,
    status,
    assetCondition,
    assignedTo,
    custodian,
    warrantyExpiry,
    depreciationMethod,
    usefulLifeYears,
  } = body;

  if (!name || !categoryId || !purchaseDate || !purchaseCost) {
    return badRequest('Name, category, purchase date, and purchase cost are required');
  }

  const assetNo = await getNextSequence(prisma, 'erpAsset', 'assetNo', 'AST');

  const asset = await prisma.erpAsset.create({
    data: {
      assetNo,
      categoryId: categoryId as string,
      name: name as string,
      description: description as string | undefined,
      model: model as string | undefined,
      serialNo: serialNo as string | undefined,
      manufacturer: manufacturer as string | undefined,
      location: location as string | undefined,
      purchaseDate: new Date(purchaseDate as string),
      purchaseCost: parseFloat(purchaseCost as string),
      salvageValue: parseFloat(salvageValue as string) || 0,
      status: (status as string) || 'operational',
      assetCondition: (assetCondition as string) || 'good',
      assignedTo: assignedTo as string | undefined,
      custodian: custodian as string | undefined,
      warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry as string) : undefined,
      depreciationMethod: (depreciationMethod as string) || 'straight_line',
      usefulLifeYears: usefulLifeYears ? parseInt(usefulLifeYears as string) : undefined,
      branchId: (session.user as any)?.branchId || null,
    },
    include: { category: true, branch: true },
  });

  return created(asset);
}

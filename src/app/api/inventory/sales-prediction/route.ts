import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, created, ok, getBody, parseListParams, getBranchFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const sp = parseListParams(request.nextUrl.searchParams);
  const productId = request.nextUrl.searchParams.get('productId');
  const branchIdParam = request.nextUrl.searchParams.get('branchId');
  const sort = sp.sort || 'predictedDate';
  const order = sp.order || 'desc';
  const page = sp.page || 1;
  const limit = sp.limit || 50;
  const branchFilter = getBranchFilter(session);
  const where: Record<string, unknown> = {};
  Object.assign(where, branchFilter);
  if (productId) where.productId = productId;
  if (branchIdParam) where.branchId = branchIdParam;

  const orderBy: Record<string, 'asc' | 'desc'> = {};
  orderBy[sort] = order;

  const [items, total] = await Promise.all([
    prisma.erpSalesPrediction.findMany({
      where,
      orderBy: orderBy as any,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.erpSalesPrediction.count({ where }),
  ]);

  return ok({ items, total, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { productId, productName, branchId, predictedDate, predictedQuantity, predictedAmount, confidenceLevel, trend, actualQuantity, variance } = body;
  if (!productId || !productName || !predictedDate || predictedQuantity === undefined) {
    return badRequest('productId, productName, predictedDate, and predictedQuantity are required');
  }

  const prediction = await prisma.erpSalesPrediction.create({
    data: {
      productId: productId as string,
      productName: productName as string,
      branchId: (branchId as string) || (session.user as any)?.branchId || null,
      predictedDate: new Date(predictedDate as string),
      predictedQuantity: parseFloat(predictedQuantity as string),
      predictedAmount: predictedAmount !== undefined ? parseFloat(predictedAmount as string) : null,
      confidenceLevel: confidenceLevel !== undefined ? parseFloat(confidenceLevel as string) : 0.8,
      trend: (trend as string) || 'stable',
      actualQuantity: actualQuantity !== undefined ? parseFloat(actualQuantity as string) : null,
      variance: variance !== undefined ? parseFloat(variance as string) : null,
    },
  });

  return created(prediction);
}

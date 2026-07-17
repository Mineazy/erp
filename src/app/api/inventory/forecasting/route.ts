import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, created, ok, getBody, parseListParams, getBranchFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const sp = parseListParams(request.nextUrl.searchParams);
  const productId = request.nextUrl.searchParams.get('productId');
  const sort = sp.sort || 'forecastDate';
  const order = sp.order || 'desc';
  const page = sp.page || 1;
  const limit = sp.limit || 50;
  const branchFilter = getBranchFilter(session);
  const where: Record<string, unknown> = {};
  Object.assign(where, branchFilter);
  if (productId) where.productId = productId;

  const orderBy: Record<string, 'asc' | 'desc'> = {};
  orderBy[sort] = order;

  const [items, total] = await Promise.all([
    prisma.erpInventoryForecast.findMany({
      where,
      orderBy: orderBy as any,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.erpInventoryForecast.count({ where }),
  ]);

  return ok({ items, total, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { productId, productName, forecastDate, predictedDemand, confidenceLevel, seasonalPattern, reorderPoint, reorderQuantity, predictedStockoutDate } = body;
  if (!productId || !productName || !forecastDate || predictedDemand === undefined) {
    return badRequest('productId, productName, forecastDate, and predictedDemand are required');
  }

  const forecast = await prisma.erpInventoryForecast.create({
    data: {
      productId: productId as string,
      productName: productName as string,
      forecastDate: new Date(forecastDate as string),
      predictedDemand: parseFloat(predictedDemand as string),
      confidenceLevel: confidenceLevel !== undefined ? parseFloat(confidenceLevel as string) : 0.8,
      seasonalPattern: seasonalPattern as string | undefined,
      reorderPoint: reorderPoint !== undefined ? parseFloat(reorderPoint as string) : null,
      reorderQuantity: reorderQuantity !== undefined ? parseFloat(reorderQuantity as string) : null,
      predictedStockoutDate: predictedStockoutDate ? new Date(predictedStockoutDate as string) : null,
      branchId: (session.user as any)?.branchId || null,
    },
  });

  return created(forecast);
}

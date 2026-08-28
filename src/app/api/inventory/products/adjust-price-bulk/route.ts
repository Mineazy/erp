import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, getBody } from '@/lib/api';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body: any = await getBody(request);
  const { productIds, priceType, adjustmentType, adjustmentValue, categoryId, reason } = body;

  if (!priceType || !['cost_price', 'selling_price'].includes(priceType)) {
    return badRequest('priceType must be "cost_price" or "selling_price"');
  }
  if (!adjustmentType || !['percentage', 'fixed'].includes(adjustmentType)) {
    return badRequest('adjustmentType must be "percentage" or "fixed"');
  }
  if (adjustmentValue === undefined || adjustmentValue === null || isNaN(Number(adjustmentValue))) {
    return badRequest('adjustmentValue is required');
  }
  if (adjustmentType === 'percentage' && (Number(adjustmentValue) < -100 || Number(adjustmentValue) > 1000)) {
    return badRequest('Percentage must be between -100 and 1000');
  }
  if (adjustmentType === 'fixed' && Number(adjustmentValue) === 0) {
    return badRequest('Fixed adjustment cannot be zero');
  }

  const priceField = priceType === 'cost_price' ? 'costPrice' : 'sellingPrice';
  const val = Number(adjustmentValue);

  let where: any = {};
  if (productIds && Array.isArray(productIds) && productIds.length > 0) {
    where.id = { in: productIds };
  } else if (categoryId) {
    where.categoryId = categoryId;
  } else {
    return badRequest('Provide productIds array or categoryId');
  }

  const products = await prisma.erpProduct.findMany({ where });

  if (products.length === 0) {
    return badRequest('No products found matching criteria');
  }

  const results: any[] = [];
  const adjustments: any[] = [];

  for (const product of products) {
    const oldPrice = Number(product[priceField]);
    let newPrice: number;

    if (adjustmentType === 'percentage') {
      newPrice = Math.round(oldPrice * (1 + val / 100) * 100) / 100;
    } else {
      newPrice = Math.round((oldPrice + val) * 100) / 100;
    }

    if (newPrice < 0) newPrice = 0;
    if (newPrice === oldPrice) continue;

    const changeAmount = newPrice - oldPrice;
    const changePercent = oldPrice !== 0 ? ((changeAmount / oldPrice) * 100) : null;

    adjustments.push({
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      priceType,
      oldPrice,
      newPrice,
      changeAmount,
      changePercent,
      reason: reason || null,
      userId: (session.user as any).id || (session.user as any).email || 'system',
      userName: session.user?.name || null,
    });

    results.push({
      id: product.id,
      code: product.code,
      name: product.name,
      oldPrice,
      newPrice,
      changeAmount,
    });
  }

  if (adjustments.length === 0) {
    return badRequest('No price changes needed - all products already have the target prices');
  }

  await prisma.$transaction(
    adjustments.map(adj => prisma.erpProduct.update({
      where: { id: adj.productId },
      data: { [priceField]: adj.newPrice },
    }))
  );

  await prisma.erpPriceAdjustment.createMany({ data: adjustments });

  return ok({
    updated: results.length,
    results,
    summary: {
      priceType,
      adjustmentType,
      adjustmentValue: val,
      reason: reason || null,
    },
  });
}

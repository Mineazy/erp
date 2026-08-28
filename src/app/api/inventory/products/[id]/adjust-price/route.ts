import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, getBody, notFound } from '@/lib/api';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const body: any = await getBody(request);
  const { priceType, newPrice, reason } = body;

  if (!priceType || !['cost_price', 'selling_price'].includes(priceType)) {
    return badRequest('priceType must be "cost_price" or "selling_price"');
  }
  if (newPrice === undefined || newPrice === null || isNaN(Number(newPrice)) || Number(newPrice) < 0) {
    return badRequest('newPrice is required and must be >= 0');
  }

  const product = await prisma.erpProduct.findUnique({ where: { id } });
  if (!product) return notFound('Product not found');

  const priceField = priceType === 'cost_price' ? 'costPrice' : 'sellingPrice';
  const oldPrice = Number(product[priceField]);
  const newPriceNum = Number(newPrice);
  const changeAmount = newPriceNum - oldPrice;
  const changePercent = oldPrice !== 0 ? ((changeAmount / oldPrice) * 100) : null;

  if (changeAmount === 0) {
    return badRequest('New price is the same as current price');
  }

  const [updated] = await prisma.$transaction([
    prisma.erpProduct.update({
      where: { id },
      data: { [priceField]: newPriceNum },
    }),
    prisma.erpPriceAdjustment.create({
      data: {
        productId: id,
        productName: product.name,
        productCode: product.code,
        priceType,
        oldPrice,
        newPrice: newPriceNum,
        changeAmount,
        changePercent,
        reason: reason || null,
        userId: (session.user as any).id || (session.user as any).email || 'system',
        userName: session.user?.name || null,
      },
    }),
  ]);

  return ok({ product: updated, adjustment: { oldPrice, newPrice: newPriceNum, changeAmount, changePercent } });
}

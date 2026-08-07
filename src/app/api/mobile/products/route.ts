import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok, getBranchFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const branchFilter = getBranchFilter(session);

  const products = await prisma.erpProduct.findMany({
    where: {
      isActive: true
    },
    include: {
      category: true
    },
    orderBy: {
      name: 'asc'
    }
  });

  const branchStocks = await prisma.erpBranchStock.findMany({
    where: branchFilter?.branchId ? { branchId: branchFilter.branchId } : undefined
  });
  const stockMap = new Map();
  for (const bs of branchStocks) {
    stockMap.set(bs.productId, (stockMap.get(bs.productId) || 0) + Number(bs.quantity));
  }

  const formatted = products.map(p => {
    const price = Number(p.sellingPrice);
    return {
      id: p.id,
      sku: p.code || p.id.substring(0, 8),
      name: p.name,
      description: p.description || '',
      category: p.category?.name || 'Uncategorized',
      price: price,
      priceExcl: price / 1.15,
      stockQuantity: stockMap.get(p.id) || 0,
      unitOfMeasure: p.unit || 'EA',
      shelfLocation: p.location || '',
      binNumber: '',
      aisleNumber: '',
      barcode: p.barcode || '',
      partNumber: p.code || ''
    };
  });

  return ok(formatted);
}

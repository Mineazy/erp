import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok, getBranchFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const branchFilter = getBranchFilter(session);

  const products = await prisma.erpProduct.findMany({
    where: {
      ...branchFilter,
      isActive: true
    },
    include: {
      category: true
    },
    orderBy: {
      name: 'asc'
    }
  });

  const formatted = products.map(p => ({
    id: p.id,
    code: p.code || p.id.substring(0, 8),
    name: p.name,
    category: p.category?.name || 'Uncategorized',
    sellingPrice: Number(p.sellingPrice),
    stockQuantity: Number(p.stock),
    minStock: Number(p.minStock),
    unit: p.unit,
    isActive: p.isActive,
    barcode: p.barcode,
    image: null
  }));

  return ok(formatted);
}

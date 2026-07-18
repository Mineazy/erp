import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok, getBody, badRequest, created } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const categories = await prisma.erpAssetCategory.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  return ok(categories);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { code, name, description, depreciation, usefulLife, salvageRate } = body;

  if (!code || !name) {
    return badRequest('Code and name are required');
  }

  // Check for duplicate code
  const existing = await prisma.erpAssetCategory.findUnique({ where: { code: code as string } });
  if (existing) {
    return badRequest('Category code already exists');
  }

  const category = await prisma.erpAssetCategory.create({
    data: {
      code: code as string,
      name: name as string,
      description: description as string | undefined,
      depreciation: (depreciation as string) || 'straight_line',
      usefulLife: usefulLife ? parseInt(usefulLife as string) : undefined,
      salvageRate: salvageRate ? parseFloat(salvageRate as string) : undefined,
    },
  });

  return created(category);
}

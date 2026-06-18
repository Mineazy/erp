import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, created, getBody, getNextSequence } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const type = searchParams.get('type');
  const status = searchParams.get('status');

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } },
      { model: { contains: search } },
      { serialNo: { contains: search } },
    ];
  }
  if (type) where.type = type;
  if (status === 'active') where.isActive = true;
  else if (status === 'inactive') where.isActive = false;

  const items = await prisma.erpEquipment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return ok(items);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { name, type, model, manufacturer, serialNo, location, purchaseDate, purchaseCost } = body;

  if (!name) return badRequest('Name is required');

  const code = await getNextSequence(prisma, 'erpEquipment', 'code', 'EQ');

  const item = await prisma.erpEquipment.create({
    data: {
      code,
      name: name as string,
      type: (type as string) || '',
      model: (model as string) || '',
      manufacturer: (manufacturer as string) || '',
      serialNo: (serialNo as string) || '',
      location: (location as string) || '',
      purchaseDate: purchaseDate ? new Date(purchaseDate as string) : null,
      purchaseCost: parseFloat((purchaseCost as string) || '0'),
    },
  });
  return created(item);
}

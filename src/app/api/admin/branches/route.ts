import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, created, getBody, getNextSequence } from '@/lib/api';

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const branches = await prisma.erpBranch.findMany({
    orderBy: { name: 'asc' },
  });

  return ok(branches);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { code, name, address, city, country, phone, email } = body;

  if (!code || !name) return badRequest('Code and name are required');

  const existing = await prisma.erpBranch.findUnique({ where: { code: code as string } });
  if (existing) return badRequest('Branch code already exists');

  const branch = await prisma.erpBranch.create({
    data: {
      code: code as string,
      name: name as string,
      address: address as string || null,
      city: city as string || null,
      country: country as string || null,
      phone: phone as string || null,
      email: email as string || null,
    },
  });

  return created(branch);
}

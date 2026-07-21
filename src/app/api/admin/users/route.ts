import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, created, ok, getBody } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const role = searchParams.get('role');
  const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : null;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
    ];
  }
  if (role) where.role = role;

  const total = await prisma.erpUser.count({ where });

  const queryOptions: any = {
    where,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      department: true,
      branchId: true,
      branch: { select: { id: true, code: true, name: true } },
      mfaEnabled: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  };

  if (page !== null) {
    queryOptions.skip = (page - 1) * limit;
    queryOptions.take = limit;
  }

  const items = await prisma.erpUser.findMany(queryOptions);

  if (page !== null) {
    const adminCount = await prisma.erpUser.count({ where: { role: 'admin' } });
    const accountantCount = await prisma.erpUser.count({ where: { role: 'accountant' } });
    const managerCount = await prisma.erpUser.count({ where: { role: 'manager' } });
    const userCount = await prisma.erpUser.count({ where: { role: 'user' } });

    return ok({
      items,
      total,
      page,
      limit,
      stats: {
        total: await prisma.erpUser.count(),
        admin: adminCount,
        accountant: accountantCount,
        manager: managerCount,
        user: userCount,
      }
    });
  }
  return ok(items);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { email, password, name, role, department, branchId } = body;
  if (!email) return badRequest('Email is required');
  if (!password) return badRequest('Password is required');
  if (!name) return badRequest('Name is required');

  const existing = await prisma.erpUser.findUnique({ where: { email: email as string } });
  if (existing) return badRequest('Email already in use');

  const hashedPassword = await bcrypt.hash(password as string, 12);

  const item = await prisma.erpUser.create({
    data: {
      email: (email as string).toLowerCase(),
      password: hashedPassword,
      name: name as string,
      role: (role as string) || 'user',
      department: department as string | undefined,
      branchId: branchId as string | undefined,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      department: true,
      branchId: true,
      branch: { select: { id: true, code: true, name: true } },
      mfaEnabled: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return created(item);
}

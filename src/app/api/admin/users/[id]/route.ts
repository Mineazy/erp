import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, badRequest, ok, getBody } from '@/lib/api';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const item = await prisma.erpUser.findUnique({
    where: { id: id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      department: true,
      mfaEnabled: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!item) return notFound('User not found');
  return ok(item);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpUser.findUnique({ where: { id: id } });
  if (!existing) return notFound('User not found');

  const body = await getBody(request);
  const { email, password, name, role, department, isActive } = body;

  const data: Record<string, unknown> = {};
  if (email) data.email = (email as string).toLowerCase();
  if (password) data.password = await bcrypt.hash(password as string, 12);
  if (name) data.name = name as string;
  if (role) data.role = role as string;
  if (department !== undefined) data.department = department;
  if (isActive !== undefined) data.isActive = Boolean(isActive);

  const item = await prisma.erpUser.update({
    where: { id: id },
    data: data as any,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      department: true,
      mfaEnabled: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return ok(item);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  if ((session.user as { id: string }).id === id) {
    return badRequest('Cannot delete your own account');
  }

  const existing = await prisma.erpUser.findUnique({ where: { id: id } });
  if (!existing) return notFound('User not found');

  await prisma.erpUser.delete({ where: { id: id } });
  return ok({ deleted: true });
}

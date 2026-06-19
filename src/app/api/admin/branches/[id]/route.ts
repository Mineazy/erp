import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, badRequest, ok, getBody } from '@/lib/api';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const branch = await prisma.erpBranch.findUnique({ where: { id } });
  if (!branch) return notFound('Branch not found');
  return ok(branch);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpBranch.findUnique({ where: { id } });
  if (!existing) return notFound('Branch not found');

  const body = await getBody(request);
  const { code, name, address, city, country, phone, email, isActive } = body;

  if (code && code !== existing.code) {
    const dup = await prisma.erpBranch.findUnique({ where: { code: code as string } });
    if (dup) return badRequest('Branch code already exists');
  }

  const branch = await prisma.erpBranch.update({
    where: { id },
    data: {
      ...(code !== undefined && { code: code as string }),
      ...(name !== undefined && { name: name as string }),
      ...(address !== undefined && { address: address as string }),
      ...(city !== undefined && { city: city as string }),
      ...(country !== undefined && { country: country as string }),
      ...(phone !== undefined && { phone: phone as string }),
      ...(email !== undefined && { email: email as string }),
      ...(isActive !== undefined && { isActive: isActive as boolean }),
    },
  });

  return ok(branch);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpBranch.findUnique({ where: { id } });
  if (!existing) return notFound('Branch not found');

  await prisma.erpBranch.delete({ where: { id } });
  return ok({ success: true });
}

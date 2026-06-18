import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody } from '@/lib/api';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const item = await prisma.erpSupplier.findUnique({ where: { id: id } });
  if (!item) return notFound('Supplier not found');
  return ok(item);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpSupplier.findUnique({ where: { id: id } });
  if (!existing) return notFound('Supplier not found');

  const body = await getBody(request);
  const { name, contactPerson, email, phone, city, paymentTerms, category, itf263Status, performanceScore, blacklisted, isActive } = body;

  const data: Record<string, unknown> = {};
  if (name) data.name = name;
  if (contactPerson !== undefined) data.contactPerson = contactPerson;
  if (email !== undefined) data.email = email;
  if (phone !== undefined) data.phone = phone;
  if (city !== undefined) data.city = city;
  if (paymentTerms) data.paymentTerms = paymentTerms;
  if (category) data.category = category;
  if (itf263Status) data.itf263Status = itf263Status;
  if (performanceScore !== undefined) data.performanceScore = parseInt(performanceScore as string);
  if (blacklisted !== undefined) data.blacklisted = blacklisted === true;
  if (isActive !== undefined) data.isActive = isActive === true;

  const item = await prisma.erpSupplier.update({
    where: { id: id },
    data: data as any,
  });
  return ok(item);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpSupplier.findUnique({ where: { id: id } });
  if (!existing) return notFound('Supplier not found');

  await prisma.erpSupplier.delete({ where: { id: id } });
  return ok({ deleted: true });
}

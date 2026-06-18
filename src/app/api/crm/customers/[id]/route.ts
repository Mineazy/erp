import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody } from '@/lib/api';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const item = await prisma.erpCustomer.findUnique({ where: { id: id } });
  if (!item) return notFound('Customer not found');
  return ok(item);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpCustomer.findUnique({ where: { id: id } });
  if (!existing) return notFound('Customer not found');

  const body = await getBody(request);
  const { name, type, contactPerson, email, phone, mobile, address, city, country, taxId, creditLimit, notes, isActive } = body;

  const data: Record<string, unknown> = {};
  if (name) data.name = name as string;
  if (type) data.type = type as string;
  if (contactPerson !== undefined) data.contactPerson = contactPerson;
  if (email !== undefined) data.email = email;
  if (phone !== undefined) data.phone = phone;
  if (mobile !== undefined) data.mobile = mobile;
  if (address !== undefined) data.address = address;
  if (city !== undefined) data.city = city;
  if (country !== undefined) data.country = country;
  if (taxId !== undefined) data.taxId = taxId;
  if (creditLimit !== undefined) data.creditLimit = parseFloat(creditLimit as string);
  if (notes !== undefined) data.notes = notes;
  if (isActive !== undefined) data.isActive = Boolean(isActive);

  const item = await prisma.erpCustomer.update({
    where: { id: id },
    data: data as any,
  });
  return ok(item);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpCustomer.findUnique({ where: { id: id } });
  if (!existing) return notFound('Customer not found');

  await prisma.erpCustomer.delete({ where: { id: id } });
  return ok({ deleted: true });
}

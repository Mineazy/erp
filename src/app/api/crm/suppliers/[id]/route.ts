import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody } from '@/lib/api';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const item = await prisma.erpSupplier.findUnique({
    where: { id: id },
    include: { contracts: true },
  });
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
  const {
    name, contactPerson, email, phone, address, city, country,
    taxId, vatNumber, tinNumber, paymentTerms, notes, isActive,
    itf263Status, itf263Expiry, itf263DocUrl,
    performanceScore, category, blacklisted,
  } = body;

  const data: Record<string, unknown> = {};
  if (name) data.name = name as string;
  if (contactPerson !== undefined) data.contactPerson = contactPerson;
  if (email !== undefined) data.email = email;
  if (phone !== undefined) data.phone = phone;
  if (address !== undefined) data.address = address;
  if (city !== undefined) data.city = city;
  if (country !== undefined) data.country = country;
  if (taxId !== undefined) data.taxId = taxId;
  if (vatNumber !== undefined) data.vatNumber = vatNumber;
  if (tinNumber !== undefined) data.tinNumber = tinNumber;
  if (paymentTerms !== undefined) data.paymentTerms = paymentTerms;
  if (notes !== undefined) data.notes = notes;
  if (isActive !== undefined) data.isActive = Boolean(isActive);
  if (itf263Status) data.itf263Status = itf263Status as string;
  if (itf263Expiry !== undefined) data.itf263Expiry = itf263Expiry ? new Date(itf263Expiry as string) : null;
  if (itf263DocUrl !== undefined) data.itf263DocUrl = itf263DocUrl;
  if (performanceScore !== undefined) data.performanceScore = performanceScore ? parseInt(performanceScore as string) : null;
  if (category) data.category = category as string;
  if (blacklisted !== undefined) data.blacklisted = blacklisted === true || blacklisted === 'true';

  const item = await prisma.erpSupplier.update({
    where: { id: id },
    data: data as any,
    include: { contracts: true },
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

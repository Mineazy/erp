import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody } from '@/lib/api';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const product = await prisma.erpProduct.findUnique({ where: { id: id } });
  if (!product) return notFound('Product not found');

  return ok(product);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpProduct.findUnique({ where: { id: id } });
  if (!existing) return notFound('Product not found');

  const body = await getBody(request);
  const { name, description, categoryId, unit, costPrice, sellingPrice, stock, minStock, location, barcode, isActive } = body;

  const product = await prisma.erpProduct.update({
    where: { id: id },
    data: {
      ...(name !== undefined && { name: name as string }),
      ...(description !== undefined && { description: description as string | null }),
      ...(categoryId !== undefined && { categoryId: categoryId as string | null }),
      ...(unit !== undefined && { unit: unit as string }),
      ...(costPrice !== undefined && { costPrice: parseFloat(costPrice as string) }),
      ...(sellingPrice !== undefined && { sellingPrice: parseFloat(sellingPrice as string) }),
      ...(stock !== undefined && { stock: parseFloat(stock as string) }),
      ...(minStock !== undefined && { minStock: parseFloat(minStock as string) }),
      ...(location !== undefined && { location: location as string | null }),
      ...(barcode !== undefined && { barcode: barcode as string | null }),
      ...(isActive !== undefined && { isActive: isActive as boolean }),
    },
  });

  return ok(product);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpProduct.findUnique({ where: { id: id } });
  if (!existing) return notFound('Product not found');

  await prisma.erpProduct.delete({ where: { id: id } });
  return ok({ success: true });
}

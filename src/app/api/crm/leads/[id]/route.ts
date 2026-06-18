import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody } from '@/lib/api';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const item = await prisma.erpLead.findUnique({
    where: { id: id },
    include: {
      customer: true,
      interactions: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!item) return notFound('Lead not found');
  return ok(item);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpLead.findUnique({ where: { id: id } });
  if (!existing) return notFound('Lead not found');

  const body = await getBody(request);
  const { customerId, companyName, contactName, email, phone, source, stage, value, probability, assignedTo, notes, expectedCloseDate } = body;

  const data: Record<string, unknown> = {};
  if (customerId !== undefined) data.customerId = customerId;
  if (companyName) data.companyName = companyName as string;
  if (contactName) data.contactName = contactName as string;
  if (email !== undefined) data.email = email;
  if (phone !== undefined) data.phone = phone;
  if (source !== undefined) data.source = source;
  if (stage) data.stage = stage as string;
  if (value !== undefined) data.value = parseFloat(value as string);
  if (probability !== undefined) data.probability = parseInt(probability as string);
  if (assignedTo !== undefined) data.assignedTo = assignedTo;
  if (notes !== undefined) data.notes = notes;
  if (expectedCloseDate !== undefined) data.expectedCloseDate = expectedCloseDate ? new Date(expectedCloseDate as string) : null;

  const item = await prisma.erpLead.update({
    where: { id: id },
    data: data as any,
    include: {
      customer: true,
      interactions: { orderBy: { createdAt: 'desc' } },
    },
  });
  return ok(item);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpLead.findUnique({ where: { id: id } });
  if (!existing) return notFound('Lead not found');

  await prisma.erpLead.delete({ where: { id: id } });
  return ok({ deleted: true });
}

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, badRequest, ok, created, getBody, getNextSequence } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const stage = searchParams.get('stage');

  const where: any = {};
  if (search) {
    where.OR = [
      { companyName: { contains: search } },
      { contactName: { contains: search } },
      { email: { contains: search } },
    ];
  }
  if (stage) where.stage = stage;

  const items = await prisma.erpLead.findMany({
    where,
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  });
  return ok(items);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { customerId, companyName, contactName, email, phone, source, stage, value, probability, assignedTo, notes, expectedCloseDate } = body;

  if (!companyName) return badRequest('Company name is required');
  if (!contactName) return badRequest('Contact name is required');

  const item = await prisma.erpLead.create({
    data: {
      customerId: (customerId as string) || null,
      companyName: companyName as string,
      contactName: contactName as string,
      email: email as string,
      phone: phone as string,
      source: source as string,
      stage: (stage as string) || 'new',
      value: parseFloat((value as string) || '0'),
      probability: parseInt((probability as string) || '0'),
      assignedTo: assignedTo as string,
      notes: notes as string,
      expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate as string) : null,
    },
    include: { customer: true },
  });
  return created(item);
}

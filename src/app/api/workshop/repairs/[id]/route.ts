import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody } from '@/lib/api';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const card = await prisma.erpRepairJobCard.findUnique({
    where: { id },
    include: {
      branch: true,
      activities: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!card) return notFound('Repair job card not found');
  return ok(card);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const body: any = await getBody(request);

  const existing = await prisma.erpRepairJobCard.findUnique({ where: { id } });
  if (!existing) return notFound('Repair job card not found');

  const updateData: any = {};
  const allowed = ['customerName', 'customerContact', 'productName', 'productCode', 'serialNumber', 'faultDescription', 'diagnosisNotes', 'repairCost', 'replacementCost', 'priority', 'assignedTechnician', 'targetDate', 'notes', 'replacementProductId', 'replacementProductName'];
  for (const key of allowed) {
    if (body[key] !== undefined) updateData[key] = body[key] || null;
  }

  await prisma.erpRepairJobCard.update({ where: { id }, data: updateData });

  const card = await prisma.erpRepairJobCard.findUnique({
    where: { id },
    include: { branch: true, activities: { orderBy: { createdAt: 'desc' } } },
  });
  return ok(card);
}

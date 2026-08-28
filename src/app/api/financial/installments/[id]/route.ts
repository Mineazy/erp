import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok, notFound } from '@/lib/api';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const plan = await prisma.erpInstallmentPlan.findUnique({
    where: { id },
    include: {
      payments: { orderBy: { paymentDate: 'desc' } },
      arInvoice: { select: { invoiceNumber: true, id: true, amount: true, paidAmount: true, balance: true } },
    },
  });

  if (!plan) return notFound('Installment plan not found');
  return ok(plan);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  try {
    await prisma.erpInstallmentPlan.delete({ where: { id } });
    return ok({ success: true });
  } catch {
    return notFound('Plan not found');
  }
}

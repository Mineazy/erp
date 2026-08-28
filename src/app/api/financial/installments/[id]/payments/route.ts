import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, created, getBody, getNextSequence } from '@/lib/api';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const body = await getBody(request);
  const { amount, paymentDate, paymentMethod, reference, notes } = body;

  if (!amount || !paymentDate) return badRequest('Amount and payment date are required');

  const plan = await prisma.erpInstallmentPlan.findUnique({ where: { id } });
  if (!plan) return badRequest('Installment plan not found');
  if (plan.status !== 'active') return badRequest('This plan is no longer active');

  const paymentAmount = parseFloat(amount as string);
  const currentBalance = Number(plan.balanceAmount);
  if (paymentAmount > currentBalance) return badRequest(`Payment amount exceeds outstanding balance of $${currentBalance.toFixed(2)}`);

  const newBalance = currentBalance - paymentAmount;
  const receiptNumber = await getNextSequence(prisma, 'erpInstallmentPayment', 'receiptNumber', 'RCP');

  const payment = await prisma.erpInstallmentPayment.create({
    data: {
      planId: id,
      paymentDate: new Date(paymentDate as string),
      amount: paymentAmount,
      balanceAfter: newBalance,
      paymentMethod: (paymentMethod as string) || 'cash',
      receiptNumber: receiptNumber as string,
      reference: (reference as string) || null,
      notes: (notes as string) || null,
      receivedBy: (session.user as any)?.email || 'unknown',
    },
  });

  const updateData: any = { balanceAmount: newBalance };
  if (newBalance <= 0) {
    updateData.status = 'completed';
  }

  await prisma.erpInstallmentPlan.update({ where: { id }, data: updateData });

  if (plan.arInvoiceId) {
    const currentPaid = Number(plan.depositAmount) + paymentAmount;
    const arPaidAmount = Number(plan.depositAmount) + (Number(plan.totalAmount) - Number(plan.depositAmount)) - newBalance;
    await prisma.erpAccountReceivable.update({
      where: { id: plan.arInvoiceId },
      data: {
        paidAmount: arPaidAmount,
        balance: Number(plan.totalAmount) - arPaidAmount,
        status: newBalance <= 0 ? 'paid' : 'partial',
      },
    });
  }

  return created(payment);
}

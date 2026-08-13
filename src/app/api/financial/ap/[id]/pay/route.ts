import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, badRequest, ok, getNextSequence } from '@/lib/api';
import { ensureDefaultAccounts } from '@/lib/financial';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await request.json();
  const { amount, paymentMethod, reference } = body;

  const paymentAmount = Number(amount);
  if (isNaN(paymentAmount) || paymentAmount <= 0) {
    return badRequest('Invalid payment amount');
  }

  const existing = await prisma.erpAccountPayable.findUnique({ where: { id: id } });
  if (!existing) return notFound('AP record not found');

  if (paymentAmount > Number(existing.balance)) {
    return badRequest('Payment amount exceeds balance');
  }

  // Transaction for payment
  const result = await prisma.$transaction(async (tx) => {
    // 1. Update AP Bill
    const newPaidAmount = Number(existing.paidAmount) + paymentAmount;
    const newBalance = Number(existing.balance) - paymentAmount;
    const newStatus = newBalance <= 0 ? 'paid' : (newPaidAmount > 0 ? 'partially_paid' : 'unpaid');

    const updatedBill = await tx.erpAccountPayable.update({
      where: { id },
      data: {
        paidAmount: newPaidAmount,
        balance: newBalance,
        status: newStatus,
      }
    });

    // 2. Financial Integration
    const defaultAccounts = await ensureDefaultAccounts(tx as any);
    const cashAccount = defaultAccounts['Cash at Hand']; // Assuming cash payment, could branch on paymentMethod later
    const apAccount = defaultAccounts['Accounts Payable'];

    // Create Cashbook Entry (Money Out)
    const entryNumber = await getNextSequence(tx as any, 'erpCashbook', 'entryNumber', 'CB');
    await tx.erpCashbook.create({
      data: {
        entryNumber,
        entryDate: new Date(),
        type: 'OUT',
        accountId: cashAccount,
        description: `Payment for AP Bill ${existing.billNumber} to ${existing.supplierName}`,
        amount: paymentAmount,
        currency: existing.currency || 'USD',
        reference: reference || `PAY-${existing.billNumber}`,
        branchId: existing.branchId,
      }
    });

    // Create Journal Entry
    const jnlNumber = await getNextSequence(tx as any, 'erpJournalEntry', 'entryNumber', 'JNL');
    await tx.erpJournalEntry.create({
      data: {
        entryNumber: jnlNumber,
        description: `Payment for AP Bill ${existing.billNumber}`,
        entryDate: new Date(),
        period: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
        status: 'posted',
        branchId: existing.branchId,
        lines: {
          create: [
            { accountId: apAccount, debit: paymentAmount, credit: 0 },
            { accountId: cashAccount, debit: 0, credit: paymentAmount },
          ]
        }
      }
    });

    return updatedBill;
  });

  return ok({ success: true, item: result });
}

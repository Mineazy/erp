const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const transactionNumber = 'TXN-TEST-' + Date.now();
  
  const session = await prisma.erpPosSession.findFirst({ where: { status: 'open' } });
  if (!session) throw new Error('No open session');

  const prod = await prisma.erpProduct.findFirst();
  if (!prod) throw new Error('No product');

  const lineData = [{
    productId: prod.id,
    productName: prod.name,
    quantity: 1,
    unitPrice: 10,
    total: 10
  }];
  const payments = [{
    method: 'cash',
    amount: 10,
    reference: null,
    currency: 'USD',
    exchangeRate: 1
  }];

  try {
    const transaction = await prisma.erpPosTransaction.create({
      data: {
        transactionNumber,
        sessionId: session.id,
        customerId: null,
        customerName: null,
        subtotal: 10,
        taxAmount: 0,
        discount: 0,
        total: 10,
        paidAmount: 10,
        changeAmount: 0,
        paymentMethod: payments[0].method,
        branchId: null,
        lines: { create: lineData },
        payments: {
          create: payments.map((p) => ({
            method: p.method,
            amount: p.amount,
            reference: p.reference,
            currency: p.currency,
            exchangeRate: p.exchangeRate,
          })),
        }
      },
      include: { lines: true, payments: true, branch: true },
    });
    console.log('Success!', transaction.id);
    
    // Cleanup
    await prisma.erpPosTransaction.delete({ where: { id: transaction.id } });
  } catch (e) {
    console.error('Failed!', e);
  } finally {
    await prisma.$disconnect();
  }
}
main();

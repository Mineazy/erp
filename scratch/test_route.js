const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getNextSequence(prisma, model, field, prefix) {
  const last = await prisma[model].findFirst({
    orderBy: { createdAt: 'desc' },
    select: { [field]: true },
  });
  let num = 1;
  if (last) {
    const match = last[field].match(/-(\d+)$/);
    if (match) num = parseInt(match[1]) + 1;
  }
  return `${prefix}-${String(num).padStart(3, '0')}`;
}

async function testRoute() {
  const session = await prisma.erpPosSession.findFirst({ where: { status: 'open' } });
  if (!session) throw new Error('No open session');
  const prod = await prisma.erpProduct.findFirst();

  const body = {
    sessionId: session.id,
    customerId: undefined,
    customerName: undefined,
    transferChangeToCard: false,
    lines: [
      {
        productId: prod.id,
        productName: prod.name,
        quantity: 1,
        unitPrice: 10,
      }
    ],
    subtotal: 10,
    taxAmount: 0,
    discount: 0,
    linkedMobileOrderId: undefined,
    payments: [
      {
        method: 'cash',
        amount: 10,
        reference: undefined,
        currency: 'USD',
        exchangeRate: 1,
      }
    ]
  };

  const SESSION_MAX_MS = 24 * 60 * 60 * 1000;
  
  try {
    const sessionId = body.sessionId;
    const customerId = body.customerId;
    const customerName = body.customerName;
    const linkedMobileOrderId = body.linkedMobileOrderId;
    const lines = body.lines;
    const payments = body.payments;
    const taxAmount = body.taxAmount;
    const discount = body.discount;

    if (!sessionId || !lines?.length) throw new Error('Session and line items required');

    const posSession = await prisma.erpPosSession.findUnique({ where: { id: sessionId } });
    if (!posSession || posSession.status !== 'open') throw new Error('Session not found or not open');

    let subtotal = 0;
    const lineData = [];
    for (const l of lines) {
      const qty = parseFloat(l.quantity);
      const price = parseFloat(l.unitPrice);
      const total = qty * price;
      subtotal += total;
      lineData.push({
        productId: l.productId,
        productName: l.productName,
        quantity: qty,
        unitPrice: price,
        total,
      });
    }

    const tx = parseFloat(taxAmount || '0');
    const disc = parseFloat(discount || '0');
    const total = subtotal + tx - disc;
    const paid = payments ? payments.reduce((s, p) => s + parseFloat(p.amount || '0'), 0) : total;
    const change = Math.max(0, paid - total);

    let actualChangeAmount = change;

    const transactionNumber = await getNextSequence(prisma, 'erpPosTransaction', 'transactionNumber', 'TXN');

    const transaction = await prisma.erpPosTransaction.create({
      data: {
        transactionNumber,
        sessionId,
        customerId: customerId,
        customerName: customerName,
        subtotal,
        taxAmount: tx,
        discount: disc,
        total,
        paidAmount: paid,
        changeAmount: actualChangeAmount,
        paymentMethod: (payments?.[0]?.method) || 'cash',
        branchId: null,
        lines: { create: lineData },
        payments: payments
          ? {
              create: payments.map((p) => ({
                method: p.method,
                amount: parseFloat(p.amount),
                reference: p.reference,
                currency: p.currency || 'USD',
                exchangeRate: parseFloat(p.exchangeRate || '1'),
              })),
            }
          : undefined,
      },
      include: { lines: true, payments: true, branch: true },
    });

    for (const l of lineData) {
      await prisma.erpProduct.update({
        where: { id: l.productId },
        data: { stock: { decrement: l.quantity } },
      });
      const movementNo = await getNextSequence(prisma, 'erpStockMovement', 'movementNo', 'MOV');
      await prisma.erpStockMovement.create({
        data: {
          movementNo,
          type: 'out',
          productId: l.productId,
          productName: l.productName,
          quantity: l.quantity,
          referenceType: 'pos',
          referenceId: transaction.id,
          userId: 'unknown',
          branchId: null,
        },
      });
    }

    console.log('Success!', transaction.id);
  } catch (e) {
    console.error('Failed!', e);
  } finally {
    await prisma.$disconnect();
  }
}

testRoute();

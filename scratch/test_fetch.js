const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const session = await prisma.erpPosSession.findFirst({ where: { status: 'open' } });
  if (!session) throw new Error('No open session');
  const prod = await prisma.erpProduct.findFirst();

  const payload = {
    sessionId: session.id,
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
    payments: [
      {
        method: 'cash',
        amount: "10.00",
        currency: 'USD',
        exchangeRate: 1,
      }
    ]
  };

  try {
    const res = await fetch('http://localhost:3000/api/pos/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', text);
  } catch (err) {
    console.error('Fetch failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}
main();

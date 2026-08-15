const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const txs = await prisma.erpPosTransaction.findMany();
  console.log(txs);
  
  const txsWithLines = await prisma.erpPosTransaction.findMany({
    include: { lines: true, payments: true }
  });
  console.log('Count:', txs.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());

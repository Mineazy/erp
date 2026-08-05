import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.erpChartOfAccounts.findMany({
    select: { id: true, code: true, name: true, type: true }
  });
  console.log(JSON.stringify(accounts, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());

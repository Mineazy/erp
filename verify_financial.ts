import { PrismaClient } from '@prisma/client';
import { ensureDefaultAccounts } from './src/lib/financial';

const prisma = new PrismaClient();

async function main() {
  console.log("Checking and creating default accounts...");
  const accounts = await ensureDefaultAccounts(prisma);
  console.log("Default Accounts initialized:", accounts);
  
  const allAccounts = await prisma.erpChartOfAccounts.findMany({
    select: { code: true, name: true, type: true }
  });
  console.log("Current Chart of Accounts:", allAccounts);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

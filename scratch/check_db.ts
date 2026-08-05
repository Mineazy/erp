import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const entries = await prisma.erpJournalEntry.findMany({
      include: {
        lines: { include: { account: true } },
      },
      orderBy: { entryDate: 'desc' },
      take: 1
    });
    
    console.log("Journal fetched:", entries.length);

    const mapped = entries.map((e: any) => {
      let totalDebit = 0;
      let totalCredit = 0;
      for (const line of (e.lines || [])) {
        totalDebit += Number(line.debit || 0);
        totalCredit += Number(line.credit || 0);
      }
      return { ...e, totalDebit, totalCredit };
    });
    console.log("Mapped successfully:", mapped.length);

    const coa = await prisma.erpChartOfAccounts.findMany({
      include: { children: { include: { children: { include: { children: true } } } } },
      orderBy: { code: 'asc' },
      take: 1
    });
    console.log("COA fetched successfully:", coa.length);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();

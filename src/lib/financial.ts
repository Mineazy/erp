import { PrismaClient } from '@prisma/client';
import { getNextSequence } from './api';

const TYPE_PREFIX: Record<string, string> = {
  ASSET: '1', LIABILITY: '2', EQUITY: '3', INCOME: '4', EXPENSE: '5',
};

export async function ensureDefaultAccounts(prisma: PrismaClient) {
  const accountDefinitions = [
    { codeMatch: '1000', name: 'Cash at Hand', type: 'ASSET', category: 'Cash' },
    { codeMatch: '1100', name: 'Accounts Receivable', type: 'ASSET', category: 'Receivables' },
    { codeMatch: '1200', name: 'Inventory Asset', type: 'ASSET', category: 'Inventory' },
    { codeMatch: '2000', name: 'Sales Tax Payable', type: 'LIABILITY', category: 'Tax' },
    { codeMatch: '4000', name: 'Sales Revenue', type: 'INCOME', category: 'Revenue' },
    { codeMatch: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE', category: 'Cost of Sales' },
  ];

  const accounts: Record<string, string> = {};

  for (const def of accountDefinitions) {
    let acc = await prisma.erpChartOfAccounts.findFirst({
      where: { name: def.name, type: def.type }
    });

    if (!acc) {
      const code = await getNextSequence(prisma, 'erpChartOfAccounts', 'code', TYPE_PREFIX[def.type] + def.codeMatch);
      acc = await prisma.erpChartOfAccounts.create({
        data: {
          code: def.codeMatch,
          name: def.name,
          type: def.type,
          category: def.category,
          isHeader: false,
        }
      });
    }
    accounts[def.name] = acc.id;
  }

  return accounts;
}

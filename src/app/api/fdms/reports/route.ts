import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentYearStart = new Date(now.getFullYear(), 0, 1);

  // In a real system these would query actual fiscal devices or POS tickets that have been fiscalised.
  // We'll mock them based on POS sales since we don't have explicit FDMS models in Prisma.
  
  // Submitted Documents this month (number of POS sales this month)
  const submittedDocs = await prisma.erpPosSale.count({
    where: { date: { gte: currentMonthStart } }
  });

  // Portal Success Rate (Mock)
  const successRate = 99.4;

  // VAT Liability YTD
  const salesYTD = await prisma.erpPosSale.aggregate({
    where: { date: { gte: currentYearStart } },
    _sum: { taxAmount: true }
  });
  const vatLiability = Number(salesYTD._sum.taxAmount || 0);

  // Active Fiscal Device
  const activeDeviceStatus = 'ONLINE';

  return ok({
    metrics: {
      submittedDocs,
      successRate,
      vatLiability,
      activeDeviceStatus
    }
  });
}

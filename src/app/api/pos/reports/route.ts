import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const now = new Date();
  const currentYearStart = new Date(now.getFullYear(), 0, 1);

  // Total POS Sales YTD
  const salesYTD = await prisma.erpPosTransaction.aggregate({
    where: { status: 'completed', createdAt: { gte: currentYearStart } },
    _sum: { total: true }
  });
  const totalSalesYTD = Number(salesYTD._sum.total || 0);

  // Active Sales Sessions
  const activeSessions = await prisma.erpPosSession.count({
    where: { status: 'open' }
  });

  // Variance discrepancies (sum of cashDifference in Z-Reports)
  const zReports = await prisma.erpZReport.aggregate({
    _sum: { cashDifference: true }
  });
  const totalVariance = Number(zReports._sum.cashDifference || 0);

  // Multi-Currency Ratio (transactions not in USD)
  const allTxCount = await prisma.erpPosTransaction.count({ where: { status: 'completed' } });
  const nonUsdTxCount = await prisma.erpPosTransaction.count({ where: { status: 'completed', currency: { not: 'USD' } } });
  
  const multiCurrencyRatio = allTxCount > 0 ? (nonUsdTxCount / allTxCount) * 100 : 0;

  return ok({
    metrics: {
      totalSalesYTD,
      activeSessions,
      totalVariance,
      multiCurrencyRatio
    }
  });
}

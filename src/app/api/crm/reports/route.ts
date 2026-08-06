import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const now = new Date();
  const currentYearStart = new Date(now.getFullYear(), 0, 1);

  // Total Customers
  const totalCustomers = await prisma.erpCustomer.count({ where: { isActive: true } });

  // VIP Big Spenders (spent $5000+ YTD) - Assuming totalSpent tracks their lifetime or YTD spend
  const vipCustomers = await prisma.erpCustomer.count({
    where: { isActive: true, totalSpent: { gte: 5000 } }
  });

  // Outstanding Loyalty Points
  const pointsAgg = await prisma.erpCustomer.aggregate({
    where: { isActive: true },
    _sum: { loyaltyPoints: true }
  });
  const totalPoints = pointsAgg._sum.loyaltyPoints || 0;

  // Loyalty Card Credits
  const cardAgg = await prisma.erpCustomer.aggregate({
    where: { isActive: true },
    _sum: { cardBalance: true }
  });
  const totalCardCredits = Number(cardAgg._sum.cardBalance || 0);

  return ok({
    metrics: {
      totalCustomers,
      vipCustomers,
      totalPoints,
      totalCardCredits
    }
  });
}

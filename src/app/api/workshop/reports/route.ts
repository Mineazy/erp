import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const now = new Date();
  const currentYearStart = new Date(now.getFullYear(), 0, 1);

  // Average Uptime (Mocked for now)
  const averageUptime = 94.2;

  // MTTR (Mocked for now)
  const mttr = 3.4;

  // Maintenance YTD
  const maintenanceYTD = await prisma.erpWorkOrder.aggregate({
    where: { createdAt: { gte: currentYearStart } },
    _sum: { totalCost: true }
  });
  const totalMaintenance = Number(maintenanceYTD._sum.totalCost || 0);

  // Active Work Orders (Equipment in service)
  const activeWorkOrders = await prisma.erpEquipment.count({
    where: { status: 'in_service' }
  });

  return ok({
    metrics: {
      averageUptime,
      mttr,
      totalMaintenance,
      activeWorkOrders
    }
  });
}

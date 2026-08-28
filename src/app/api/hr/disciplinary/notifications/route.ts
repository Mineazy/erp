import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const upcomingCases = await prisma.hrDisciplinary.findMany({
    where: {
      nextHearingDate: { not: null, gte: now, lte: in7Days },
      status: { notIn: ['closed', 'resolved'] },
    },
    include: {
      staff: { select: { employeeCode: true, firstName: true, lastName: true, department: true, position: true, branchId: true } },
    },
    orderBy: { nextHearingDate: 'asc' },
  });

  const notifications = upcomingCases.map((c: any) => {
    const hearingDate = new Date(c.nextHearingDate!);
    const diffMs = hearingDate.getTime() - now.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    let severity: 'critical' | 'warning' | 'info' = 'info';
    let urgencyLabel = '';
    if (diffHours <= 24) {
      severity = 'critical';
      urgencyLabel = diffHours <= 1 ? 'Today' : diffHours <= 24 ? 'Tomorrow' : `${diffHours} hours`;
    } else if (diffHours <= 72) {
      severity = 'warning';
      urgencyLabel = `${diffDays} days`;
    } else {
      urgencyLabel = `${diffDays} days`;
    }

    return {
      id: c.id,
      caseNumber: c.caseNumber,
      staffName: `${c.staff.firstName} ${c.staff.lastName}`,
      employeeCode: c.staff.employeeCode,
      department: c.staff.department,
      incidentType: c.incidentType,
      warningLevel: c.warningLevel,
      nextHearingDate: c.nextHearingDate,
      nextHearingTime: c.nextHearingTime,
      nextHearingVenue: c.nextHearingVenue,
      severity,
      urgencyLabel,
      message: `Hearing for ${c.caseNumber} (${c.staff.firstName} ${c.staff.lastName}) is due in ${urgencyLabel}`,
    };
  });

  const todayCount = notifications.filter((n: any) => n.severity === 'critical').length;
  const upcomingCount = notifications.length;

  return ok({
    notifications,
    todayCount,
    upcomingCount,
    total: upcomingCases.length,
  });
}

import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok } from '@/lib/api';

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const [
    totalStaff,
    activeStaff,
    staffByDepartment,
    staffByBranch,
    staffByType,
    staffByGender,
    totalLeave,
    leaveByType,
    leaveByStatus,
    totalLeaveDays,
    totalTimesheets,
    timesheetsByStatus,
    totalHoursWorked,
    totalOvertimeHours,
    totalLoans,
    loansByType,
    loansByStatus,
    totalLoanAmount,
    totalOutstanding,
    recentLeaves,
    recentTimesheets,
    recentLoans,
  ] = await Promise.all([
    prisma.hrStaff.count(),
    prisma.hrStaff.count({ where: { isActive: true } }),
    prisma.hrStaff.groupBy({ by: ['department'], _count: true, orderBy: { _count: { department: 'desc' } } }),
    prisma.hrStaff.groupBy({ by: ['branchId'], _count: true, orderBy: { _count: { branchId: 'desc' } } }),
    prisma.hrStaff.groupBy({ by: ['employmentType'], _count: true }),
    prisma.hrStaff.groupBy({ by: ['gender'], _count: true, where: { gender: { not: null } } }),
    prisma.hrLeave.count(),
    prisma.hrLeave.groupBy({ by: ['leaveType'], _count: true, orderBy: { _count: { leaveType: 'desc' } } }),
    prisma.hrLeave.groupBy({ by: ['status'], _count: true }),
    prisma.hrLeave.aggregate({ _sum: { days: true }, _avg: { days: true } }),
    prisma.hrTimesheet.count(),
    prisma.hrTimesheet.groupBy({ by: ['status'], _count: true }),
    prisma.hrTimesheet.aggregate({ _sum: { hoursWorked: true } }),
    prisma.hrTimesheet.aggregate({ _sum: { overtimeHours: true } }),
    prisma.hrLoan.count(),
    prisma.hrLoan.groupBy({ by: ['loanType'], _count: true, orderBy: { _count: { loanType: 'desc' } } }),
    prisma.hrLoan.groupBy({ by: ['status'], _count: true }),
    prisma.hrLoan.aggregate({ _sum: { amount: true } }),
    prisma.hrLoan.aggregate({ _sum: { outstandingBalance: true } }),
    prisma.hrLeave.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { staff: { select: { firstName: true, lastName: true, employeeCode: true } } } }),
    prisma.hrTimesheet.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { staff: { select: { firstName: true, lastName: true, employeeCode: true } } } }),
    prisma.hrLoan.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { staff: { select: { firstName: true, lastName: true, employeeCode: true } } } }),
  ]);

  // Resolve branch IDs to names
  const branchIds = staffByBranch.map(b => b.branchId).filter(Boolean) as string[];
  const branches = branchIds.length > 0 ? await prisma.erpBranch.findMany({ where: { id: { in: branchIds } }, select: { id: true, name: true } }) : [];
  const branchMap = new Map(branches.map(b => [b.id, b.name]));

  return ok({
    staff: {
      total: totalStaff,
      active: activeStaff,
      inactive: totalStaff - activeStaff,
      byDepartment: staffByDepartment.filter(s => s.department).map(s => ({ label: s.department!, value: s._count })),
      byBranch: staffByBranch.map(s => ({ label: branchMap.get(s.branchId || '') || 'Unassigned', value: s._count })),
      byType: staffByType.map(s => ({ label: s.employmentType.replace(/_/g, ' '), value: s._count })),
      byGender: staffByGender.map(s => ({ label: s.gender!, value: s._count })),
    },
    leave: {
      total: totalLeave,
      byType: leaveByType.map(l => ({ label: l.leaveType, value: l._count })),
      byStatus: leaveByStatus.map(l => ({ label: l.status, value: l._count })),
      totalDays: Number(totalLeaveDays._sum.days || 0),
      avgDays: Number(totalLeaveDays._avg.days || 0).toFixed(1),
    },
    timesheets: {
      total: totalTimesheets,
      byStatus: timesheetsByStatus.map(t => ({ label: t.status, value: t._count })),
      totalHours: Number(totalHoursWorked._sum.hoursWorked || 0),
      totalOvertime: Number(totalOvertimeHours._sum.overtimeHours || 0),
    },
    loans: {
      total: totalLoans,
      byType: loansByType.map(l => ({ label: l.loanType, value: l._count })),
      byStatus: loansByStatus.map(l => ({ label: l.status, value: l._count })),
      totalAmount: Number(totalLoanAmount._sum.amount || 0),
      totalOutstanding: Number(totalOutstanding._sum.outstandingBalance || 0),
    },
    recentLeaves,
    recentTimesheets,
    recentLoans,
  });
}

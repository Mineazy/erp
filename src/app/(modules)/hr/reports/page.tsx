'use client';

import { toast } from '@/components/ui/toast';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, Banknote, Calendar, Download, Briefcase, Activity } from 'lucide-react';

interface DataPoint {
  label: string;
  value: number;
}

interface StaffData {
  total: number;
  active: number;
  inactive: number;
  byDepartment: DataPoint[];
  byBranch: DataPoint[];
  byType: DataPoint[];
  byGender: DataPoint[];
}

interface LeaveData {
  total: number;
  byType: DataPoint[];
  byStatus: DataPoint[];
  totalDays: number;
  avgDays: string;
}

interface TimesheetData {
  total: number;
  byStatus: DataPoint[];
  totalHours: number;
  totalOvertime: number;
}

interface LoanData {
  total: number;
  byType: DataPoint[];
  byStatus: DataPoint[];
  totalAmount: number;
  totalOutstanding: number;
}

interface RecentItem {
  id: string;
  status: string;
  createdAt: string;
  staff: { firstName: string; lastName: string; employeeCode: string };
  leaveType?: string;
  days?: number;
  date?: string;
  hoursWorked?: number;
  loanType?: string;
  amount?: number;
  outstandingBalance?: number;
}

interface ReportsData {
  staff: StaffData;
  leave: LeaveData;
  timesheets: TimesheetData;
  loans: LoanData;
  recentLeaves: RecentItem[];
  recentTimesheets: RecentItem[];
  recentLoans: RecentItem[];
}

function HorizontalBarChart({ data, maxVal }: { data: DataPoint[]; maxVal: number }) {
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="text-xs text-slate-600 w-28 truncate text-right">{d.label}</span>
          <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${maxVal > 0 ? (d.value / maxVal) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-slate-700 w-10 text-right">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ data, colors }: { data: DataPoint[]; colors: string[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-24 h-24 flex-shrink-0">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          {data.reduce((acc, d, i) => {
            const pct = total > 0 ? (d.value / total) * 100 : 0;
            const offset = acc.offset;
            acc.elements.push(
              <circle
                key={i}
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke={colors[i % colors.length]}
                strokeWidth="4"
                strokeDasharray={`${pct} ${100 - pct}`}
                strokeDashoffset={`${-offset}`}
                className="transition-all duration-500"
              />
            );
            acc.offset += pct;
            return acc;
          }, { elements: [] as JSX.Element[], offset: 0 }).elements}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-slate-900">{total}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-1.5 text-xs">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="text-slate-600">{d.label}</span>
            <span className="font-semibold text-slate-800">({d.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-emerald-100 text-emerald-800',
    manager_approved: 'bg-blue-100 text-blue-800',
    bdm_approved: 'bg-indigo-100 text-indigo-800',
    rejected: 'bg-red-100 text-red-800',
    present: 'bg-emerald-100 text-emerald-800',
    absent: 'bg-red-100 text-red-800',
    late: 'bg-amber-100 text-amber-800',
    completed: 'bg-blue-100 text-blue-800',
  };
  return <Badge className={colors[status] || 'bg-slate-100 text-slate-800'}>{status.replace(/_/g, ' ')}</Badge>;
}

export default function HRReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/hr/reports');
      if (!res.ok) throw new Error('Failed');
      setData(await res.json());
    } catch { toast('Failed to load reports', 'error'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;
  if (!data) return <div className="p-6 text-slate-500">No data available</div>;

  const { staff, leave, timesheets, loans } = data;
  const colors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-indigo-700" />
            HR Reports & Analytics
          </h2>
          <p className="text-slate-500 mt-1">Staff overview, leave, attendance, and loan analytics</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-md">
          <CardContent className="p-5 space-y-2">
            <p className="text-xs uppercase tracking-wider opacity-75 font-semibold flex items-center gap-1"><Users className="h-3 w-3" /> Active Staff</p>
            <h3 className="text-3xl font-bold font-mono">{staff.active}</h3>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-medium">{staff.inactive} inactive</span>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
          <CardContent className="p-5 space-y-2">
            <p className="text-xs uppercase tracking-wider opacity-75 font-semibold flex items-center gap-1"><Calendar className="h-3 w-3" /> Leave Applications</p>
            <h3 className="text-3xl font-bold font-mono">{leave.total}</h3>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-medium">{leave.totalDays} total days</span>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-cyan-500 to-sky-600 text-white shadow-md">
          <CardContent className="p-5 space-y-2">
            <p className="text-xs uppercase tracking-wider opacity-75 font-semibold flex items-center gap-1"><Clock className="h-3 w-3" /> Hours Worked</p>
            <h3 className="text-3xl font-bold font-mono">{Number(timesheets.totalHours).toLocaleString(undefined, { maximumFractionDigits: 1 })}</h3>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-medium">{Number(timesheets.totalOvertime).toLocaleString(undefined, { maximumFractionDigits: 1 })} OT hours</span>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
          <CardContent className="p-5 space-y-2">
            <p className="text-xs uppercase tracking-wider opacity-75 font-semibold flex items-center gap-1"><Banknote className="h-3 w-3" /> Loans Issued</p>
            <h3 className="text-3xl font-bold font-mono">${loans.totalAmount.toLocaleString()}</h3>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-medium">${loans.totalOutstanding.toLocaleString()} outstanding</span>
          </CardContent>
        </Card>
      </div>

      {/* Staff Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold text-slate-700">Staff by Department</CardTitle></CardHeader>
          <CardContent>
            {staff.byDepartment.length > 0 ? (
              <HorizontalBarChart data={staff.byDepartment} maxVal={Math.max(...staff.byDepartment.map(d => d.value), 1)} />
            ) : <p className="text-sm text-slate-400">No department data</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold text-slate-700">Staff by Branch</CardTitle></CardHeader>
          <CardContent>
            {staff.byBranch.length > 0 ? (
              <HorizontalBarChart data={staff.byBranch} maxVal={Math.max(...staff.byBranch.map(d => d.value), 1)} />
            ) : <p className="text-sm text-slate-400">No branch data</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold text-slate-700">Employment Type Distribution</CardTitle></CardHeader>
          <CardContent>
            {staff.byType.length > 0 ? (
              <DonutChart data={staff.byType} colors={colors} />
            ) : <p className="text-sm text-slate-400">No data</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold text-slate-700">Gender Distribution</CardTitle></CardHeader>
          <CardContent>
            {staff.byGender.length > 0 ? (
              <DonutChart data={staff.byGender} colors={['#6366f1', '#ec4899', '#06b6d4', '#f59e0b']} />
            ) : <p className="text-sm text-slate-400">No data</p>}
          </CardContent>
        </Card>
      </div>

      {/* Leave & Timesheet Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold text-slate-700">Leave by Type</CardTitle></CardHeader>
          <CardContent>
            {leave.byType.length > 0 ? (
              <div className="space-y-3">
                <HorizontalBarChart data={leave.byType} maxVal={Math.max(...leave.byType.map(d => d.value), 1)} />
                <p className="text-xs text-slate-500 mt-2">Average leave duration: {leave.avgDays} days</p>
              </div>
            ) : <p className="text-sm text-slate-400">No leave data</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold text-slate-700">Leave by Status</CardTitle></CardHeader>
          <CardContent>
            {leave.byStatus.length > 0 ? (
              <DonutChart data={leave.byStatus} colors={['#f59e0b', '#10b981', '#6366f1', '#ef4444', '#06b6d4']} />
            ) : <p className="text-sm text-slate-400">No data</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold text-slate-700">Timesheet Status</CardTitle></CardHeader>
          <CardContent>
            {timesheets.byStatus.length > 0 ? (
              <DonutChart data={timesheets.byStatus} colors={['#10b981', '#ef4444', '#f59e0b', '#06b6d4', '#8b5cf6']} />
            ) : <p className="text-sm text-slate-400">No timesheet data</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold text-slate-700">Loan Status</CardTitle></CardHeader>
          <CardContent>
            {loans.byStatus.length > 0 ? (
              <DonutChart data={loans.byStatus} colors={['#f59e0b', '#10b981', '#ef4444', '#06b6d4']} />
            ) : <p className="text-sm text-slate-400">No loan data</p>}
          </CardContent>
        </Card>
      </div>

      {/* Loan by Type */}
      {loans.byType.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold text-slate-700">Loans by Type</CardTitle></CardHeader>
          <CardContent>
            <HorizontalBarChart data={loans.byType} maxVal={Math.max(...loans.byType.map(d => d.value), 1)} />
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold text-slate-700">Recent Leave Applications</CardTitle></CardHeader>
          <CardContent>
            {data.recentLeaves.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentLeaves.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">{l.staff.firstName} {l.staff.lastName}</TableCell>
                      <TableCell className="text-xs">{l.leaveType}</TableCell>
                      <TableCell className="text-xs">{l.days}</TableCell>
                      <TableCell><StatusBadge status={l.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : <p className="text-sm text-slate-400">No recent leaves</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold text-slate-700">Recent Timesheets</CardTitle></CardHeader>
          <CardContent>
            {data.recentTimesheets.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentTimesheets.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs">{t.staff.firstName} {t.staff.lastName}</TableCell>
                      <TableCell className="text-xs">{t.date ? new Date(t.date).toLocaleDateString() : '-'}</TableCell>
                      <TableCell className="text-xs">{Number(t.hoursWorked || 0).toFixed(1)}</TableCell>
                      <TableCell><StatusBadge status={t.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : <p className="text-sm text-slate-400">No recent timesheets</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold text-slate-700">Recent Loans</CardTitle></CardHeader>
          <CardContent>
            {data.recentLoans.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentLoans.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">{l.staff.firstName} {l.staff.lastName}</TableCell>
                      <TableCell className="text-xs">{l.loanType}</TableCell>
                      <TableCell className="text-xs">${Number(l.amount).toLocaleString()}</TableCell>
                      <TableCell><StatusBadge status={l.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : <p className="text-sm text-slate-400">No recent loans</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

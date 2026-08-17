'use client';

import { toast } from '@/components/ui/toast';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Search, Wrench, ClipboardList, Calendar, ShieldCheck, Activity } from 'lucide-react';
import { useReportExport } from '@/hooks/use-report-export';

interface ReportOption {
  name: string;
  type: string;
  icon: any;
  desc: string;
  category: string;
}

export default function WorkshopReportsPage() {
  const { triggerExport, ExportDialog } = useReportExport();
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState('2026-12-31');

  const reportsList: ReportOption[] = [
    { name: 'Equipment Maintenance History Log', type: 'maintenance_history', icon: Wrench, desc: 'Detailed log of all service records, parts replaced, and costs', category: 'Maintenance' },
    { name: 'Work Orders Performance & MTTR', type: 'work_orders_performance', icon: ClipboardList, desc: 'Tracks repair speed, technicians assignees, and technician workloads', category: 'Performance' },
    { name: 'Workshop Efficiency Analytics', type: 'workshop_efficiency', icon: Activity, desc: 'Resource utilization rates, labor costs, and parts inventory usage', category: 'Analytics' },
  ];

  const filteredReports = reportsList.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.desc.toLowerCase().includes(search.toLowerCase())
  );

  const [metrics, setMetrics] = useState<any>(null);

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/workshop/reports');
      if (res.ok) {
        const json = await res.json();
        setMetrics(json.metrics);
      }
    } catch (e) {
      console.error('Failed to fetch Workshop metrics', e);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const downloadReport = (reportType: string, reportName: string) => {
    const url = new URL(`/api/reports/${reportType}/generate`, window.location.origin);
    if (dateFrom) url.searchParams.set('dateFrom', dateFrom);
    if (dateTo) url.searchParams.set('dateTo', dateTo);
    
    triggerExport(url.toString(), reportName);
    toast(`Generating "${reportName}"...`, 'success');
  };

  const formatCurrency = (val: number | undefined) => {
    return `$${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (val: number | undefined) => {
    return Number(val || 0).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Wrench className="h-6 w-6 text-mine-blue-800" />
            Workshop Reports & Analytics
          </h2>
          <p className="text-slate-500 mt-1">Audit equipment downtime, repair costs, and technician logs</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
          <CardContent className="p-5 space-y-2">
            <p className="text-xs uppercase tracking-wider opacity-75 font-semibold">Average Uptime</p>
            <h3 className="text-2xl font-bold font-mono">
              {metrics ? `${metrics.averageUptime}%` : '...'}
            </h3>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-medium">Goal is 95%</span>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
          <CardContent className="p-5 space-y-2">
            <p className="text-xs uppercase tracking-wider opacity-75 font-semibold">Mean Time to Repair (MTTR)</p>
            <h3 className="text-2xl font-bold font-mono">
              {metrics ? `${metrics.mttr} hrs` : '...'}
            </h3>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-medium">Down from 4.1 last month</span>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md">
          <CardContent className="p-5 space-y-2">
            <p className="text-xs uppercase tracking-wider opacity-75 font-semibold">Maintenance YTD</p>
            <h3 className="text-2xl font-bold font-mono">
              {metrics ? formatCurrency(metrics.totalMaintenance) : '...'}
            </h3>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-medium">Spare parts & labor</span>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
          <CardContent className="p-5 space-y-2">
            <p className="text-xs uppercase tracking-wider opacity-75 font-semibold">Active Work Orders</p>
            <h3 className="text-2xl font-bold font-mono text-amber-100">
              {metrics ? `${formatNumber(metrics.activeWorkOrders)} Orders` : '...'}
            </h3>
            <span className="text-[10px] bg-white/25 px-2 py-0.5 rounded font-medium">Current load</span>
          </CardContent>
        </Card>
      </div>

      {/* Date Controls & Filters */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            Report Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">From Date</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-700" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">To Date</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-700" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Search Reports</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input type="text" placeholder="Search by report type..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full text-sm border border-slate-200 rounded-md pl-8 pr-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-700" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-mine-blue-800" />
            Standard Workshop Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.map((report) => {
                const IconComponent = report.icon;
                return (
                  <TableRow key={report.type}>
                    <TableCell className="font-semibold text-slate-800 flex items-center gap-2">
                      <div className="p-1 rounded bg-slate-50 border border-slate-100">
                        <IconComponent className="h-4 w-4 text-mine-blue-700" />
                      </div>
                      {report.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={report.category === 'Performance' ? 'success' : report.category === 'Maintenance' ? 'warning' : 'secondary'}>{report.category}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{report.desc}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" variant="default" onClick={() => downloadReport(report.type, report.name)} className="text-xs gap-1">
                          <Download className="h-3 w-3" />
                          Generate
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredReports.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-400 py-8">No matching reports found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {ExportDialog}
      </div>
  );
}

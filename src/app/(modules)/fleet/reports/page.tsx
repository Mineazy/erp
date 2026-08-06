'use client';

import { toast } from '@/components/ui/toast';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Truck, CreditCard, Wrench, ShieldAlert, Calendar, Scale } from 'lucide-react';

interface FleetMetrics {
  totalVehicles: number;
  totalServiceCosts: number;
  totalPrepaidDiesel: number;
  totalPrepaidPetrol: number;
  totalFuelIssued: number;
  trips: {
    totalTrips: number;
    activeTrips: number;
    completedTrips: number;
  };
}

export default function FleetReportsPage() {
  const [metrics, setMetrics] = useState<FleetMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState('2026-12-31');

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/fleet/reports');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
      }
    } catch (_) {
      toast('Failed to load fleet report metrics', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const reportsList = [
    { name: 'Prepaid Fuel Audit Ledger', type: 'prepaid_ledger', desc: 'Prepaid top-ups, unit price adjustments, and usage logs' },
    { name: 'Fleet Maintenance Cost Audit', type: 'fleet_maintenance', desc: 'Vehicles repair servicing history, routine diagnostics, and costs' },
    { name: 'Logistics Haulage Deliveries Log', type: 'haulage_history', desc: 'Departure times, arrival times, and cargo details of hauling trips' },
  ];

  const downloadReport = (reportType: string, reportName: string) => {
    const url = new URL(`/api/reports/${reportType}/generate`, window.location.origin);
    if (dateFrom) url.searchParams.set('dateFrom', dateFrom);
    if (dateTo) url.searchParams.set('dateTo', dateTo);
    
    window.open(url.toString(), '_blank');
    toast(`Generating "${reportName}"...`, 'success');
  };

  if (loading) return <div className="p-6 text-slate-500">Loading metrics...</div>;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Truck className="h-6 w-6 text-mine-blue-800" />
          Fleet Reports & Analytics
        </h2>
        <p className="text-slate-500 mt-1">Generate fleet asset usage reports, fuel budgets, and hauling performance diagnostics</p>
      </div>

      {/* KPI Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
          <CardContent className="p-5 space-y-2">
            <p className="text-xs uppercase tracking-wider opacity-75 font-semibold">Total Fleet Size</p>
            <h3 className="text-2xl font-bold font-mono">{metrics?.totalVehicles} Vehicles</h3>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-medium">Volvo FH16 & Scania R500</span>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md">
          <CardContent className="p-5 space-y-2">
            <p className="text-xs uppercase tracking-wider opacity-75 font-semibold">Total Service Costs</p>
            <h3 className="text-2xl font-bold font-mono">${Number(metrics?.totalServiceCosts || 0).toLocaleString()}</h3>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-medium">Routine maintenance & repairs</span>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
          <CardContent className="p-5 space-y-2">
            <p className="text-xs uppercase tracking-wider opacity-75 font-semibold">Prepaid Fuel Left</p>
            <h3 className="text-xl font-bold font-mono">D: {Number(metrics?.totalPrepaidDiesel).toLocaleString()}L</h3>
            <h3 className="text-xl font-bold font-mono">P: {Number(metrics?.totalPrepaidPetrol).toLocaleString()}L</h3>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
          <CardContent className="p-5 space-y-2">
            <p className="text-xs uppercase tracking-wider opacity-75 font-semibold">Hauling Deliveries</p>
            <h3 className="text-2xl font-bold font-mono">{metrics?.trips.completedTrips} / {metrics?.trips.totalTrips} Delivered</h3>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-medium">{metrics?.trips.activeTrips} currently in transit</span>
          </CardContent>
        </Card>
      </div>

      {/* Parameter Cards */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            Report Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">From Date</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-700" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">To Date</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-700" />
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-mine-blue-800" />
            Fleet & Fuel Audit Reports List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportsList.map((report) => (
                <TableRow key={report.type}>
                  <TableCell className="font-semibold text-slate-800">{report.name}</TableCell>
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

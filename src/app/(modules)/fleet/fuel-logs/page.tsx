'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { Droplets, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface FuelLog {
  id: string;
  vehicleId: string;
  refuelDate: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  odometer: number | null;
  fuelType: string | null;
  vendor: string | null;
  notes: string | null;
  vehicle: { id: string; plateNumber: string; make: string; model: string };
}

interface Vehicle {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
}

export default function FuelLogsPage() {
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '50');
      if (search) params.set('search', search);
      if (filterVehicle) params.set('vehicleId', filterVehicle);

      const [logsRes, vehRes] = await Promise.all([
        fetch(`/api/fleet/fuel-logs?${params}`),
        fetch('/api/fleet/vehicles'),
      ]);

      if (logsRes.ok) {
        const d = await logsRes.json();
        setFuelLogs(d.items || []);
        setTotal(d.total || 0);
      }
      if (vehRes.ok) setVehicles(await vehRes.json());
    } catch {
      toast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page, search, filterVehicle]);

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const totalPages = Math.ceil(total / 50) || 1;

  const totalQty = fuelLogs.reduce((s, r) => s + r.quantity, 0);
  const totalCost = fuelLogs.reduce((s, r) => s + r.totalCost, 0);
  const avgUnitCost = totalQty > 0 ? totalCost / totalQty : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-mine-blue-600" />
          <h1 className="text-lg font-bold text-slate-800">Fuel Consumption Logs</h1>
        </div>
        <p className="text-[10px] text-slate-400">Auto-generated from fuel requisitions</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border border-slate-100">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-slate-500 uppercase">Total Fuel</p>
            <p className="text-lg font-bold text-slate-800">{fmt(totalQty)} L</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-100">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-slate-500 uppercase">Total Cost</p>
            <p className="text-lg font-bold text-slate-800">${fmt(totalCost)}</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-100">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-slate-500 uppercase">Avg Unit Cost</p>
            <p className="text-lg font-bold text-slate-800">${fmt(avgUnitCost)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border border-slate-100">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search vendor, fuel type, plate..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="h-8 text-xs max-w-xs"
            />
            <select
              value={filterVehicle}
              onChange={e => { setFilterVehicle(e.target.value); setPage(1); }}
              className="text-xs border border-slate-200 rounded-md px-3 py-1.5 h-8 bg-white"
            >
              <option value="">All Vehicles</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.plateNumber} — {v.make} {v.model}</option>
              ))}
            </select>
            {(search || filterVehicle) && (
              <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => { setSearch(''); setFilterVehicle(''); setPage(1); }}>
                <X className="h-3 w-3 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border border-slate-100">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-5 w-5 animate-spin text-mine-blue-600" />
            </div>
          ) : fuelLogs.length === 0 ? (
            <p className="text-center py-12 text-xs text-slate-400">No fuel records found</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px]">Date</TableHead>
                      <TableHead className="text-[10px]">Vehicle</TableHead>
                      <TableHead className="text-[10px]">Type</TableHead>
                      <TableHead className="text-[10px]">Qty (L)</TableHead>
                      <TableHead className="text-[10px]">Unit Cost</TableHead>
                      <TableHead className="text-[10px]">Total</TableHead>
                      <TableHead className="text-[10px]">Odometer</TableHead>
                      <TableHead className="text-[10px]">Vendor</TableHead>
                      <TableHead className="text-[10px]">Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fuelLogs.map(r => {
                      const isAuto = r.notes?.includes('Auto from requisition');
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="text-[11px]">{new Date(r.refuelDate).toLocaleDateString()}</TableCell>
                          <TableCell className="text-[11px] font-medium">{r.vehicle.plateNumber}</TableCell>
                          <TableCell className="text-[11px]">{r.fuelType || '—'}</TableCell>
                          <TableCell className="text-[11px]">{fmt(r.quantity)}</TableCell>
                          <TableCell className="text-[11px]">${fmt(r.unitCost)}</TableCell>
                          <TableCell className="text-[11px] font-medium">${fmt(r.totalCost)}</TableCell>
                          <TableCell className="text-[11px]">{r.odometer ? `${r.odometer.toLocaleString()} km` : '—'}</TableCell>
                          <TableCell className="text-[11px]">{r.vendor || '—'}</TableCell>
                          <TableCell>
                            {isAuto ? (
                              <Badge className="bg-mine-blue-50 text-mine-blue-700 text-[9px] border border-mine-blue-200">Auto</Badge>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-500 text-[9px]">Manual</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100">
                  <p className="text-[10px] text-slate-400">Page {page} of {totalPages} ({total} records)</p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

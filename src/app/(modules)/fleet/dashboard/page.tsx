'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import {
  Truck, Fuel, Wrench, Navigation, DollarSign, TrendingUp, AlertTriangle,
  Clock, ArrowRight, Droplets, Gauge, BarChart3, Activity
} from 'lucide-react';

interface DashboardData {
  vehicles: { total: number; active: number; inTransit: number; maintenance: number };
  fuel: {
    totalUsed: number; totalCost: number; dieselUsed: number; petrolUsed: number;
    prepaidDiesel: number; prepaidPetrol: number;
    recent: any[];
    byMonth: [string, { quantity: number; cost: number }][];
    topConsumers: { vehicleId: string; plateNumber: string; make: string; model: string; quantity: number; cost: number }[];
  };
  services: { total: number; totalCost: number; upcoming: any[] };
  trips: { total: number; active: number; completed: number; scheduled: number; recent: any[] };
}

export default function FleetDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/fleet/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { toast('Failed to load dashboard', 'error'); setLoading(false); });
  }, []);

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'SCHEDULED': return <Badge className="bg-slate-100 text-slate-600 text-[9px]">{status}</Badge>;
      case 'IN_TRANSIT': return <Badge className="bg-blue-100 text-blue-700 text-[9px] animate-pulse">{status}</Badge>;
      case 'DELIVERED': return <Badge className="bg-emerald-100 text-emerald-700 text-[9px]">{status}</Badge>;
      default: return <Badge className="text-[9px]">{status}</Badge>;
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-mine-blue-600" />
    </div>
  );

  if (!data) return <div className="text-center py-12 text-slate-500">Failed to load dashboard</div>;

  const maxFuelMonth = Math.max(...data.fuel.byMonth.map(([, d]) => d.quantity), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="h-6 w-6 text-mine-blue-700" />
            Fleet Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">Overview of fleet performance, fuel, and maintenance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.push('/fleet/vehicles')}>
            <Truck className="h-3 w-3 mr-1" /> Vehicles
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.push('/fleet/fuel-logs')}>
            <Fuel className="h-3 w-3 mr-1" /> Fuel Logs
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.push('/fleet/reports')}>
            <BarChart3 className="h-3 w-3 mr-1" /> Reports
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-mine-blue-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Fleet Size</p>
              <h3 className="text-2xl font-bold text-slate-900">{data.vehicles.total}</h3>
              <p className="text-[10px] text-slate-400">{data.vehicles.active} active · {data.vehicles.inTransit} in transit</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-mine-blue-50 flex items-center justify-center">
              <Truck className="h-5 w-5 text-mine-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Fuel Consumed</p>
              <h3 className="text-2xl font-bold text-slate-900">{fmt(data.fuel.totalUsed)} L</h3>
              <p className="text-[10px] text-slate-400">${fmt(data.fuel.totalCost)} total cost</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center">
              <Fuel className="h-5 w-5 text-amber-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Hauling Trips</p>
              <h3 className="text-2xl font-bold text-slate-900">{data.trips.total}</h3>
              <p className="text-[10px] text-slate-400">{data.trips.completed} completed · {data.trips.active} in transit</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <Navigation className="h-5 w-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Service Costs</p>
              <h3 className="text-2xl font-bold text-slate-900">${fmt(data.services.totalCost)}</h3>
              <p className="text-[10px] text-slate-400">{data.services.total} service records</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center">
              <Wrench className="h-5 w-5 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fuel Breakdown + Prepaid Balances */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2 border border-slate-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Droplets className="h-4 w-4 text-amber-500" />
              Fuel Consumption by Month
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {data.fuel.byMonth.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No fuel data yet</p>
            ) : (
              <div className="space-y-1.5">
                {data.fuel.byMonth.map(([month, d]) => (
                  <div key={month} className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 w-16 shrink-0">{month}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                      <div className="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full flex items-center pl-2" style={{ width: `${(d.quantity / maxFuelMonth) * 100}%` }}>
                        <span className="text-[9px] text-white font-medium">{fmt(d.quantity)} L</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 w-20 text-right">${fmt(d.cost)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border border-slate-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Gauge className="h-4 w-4 text-emerald-500" />
              Prepaid Balances
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Diesel</span>
                <span className="text-sm font-bold text-slate-800">{fmt(data.fuel.prepaidDiesel)} L</span>
              </div>
              <div className="mt-1.5 bg-slate-200 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min((data.fuel.prepaidDiesel / 10000) * 100, 100)}%` }} />
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Petrol</span>
                <span className="text-sm font-bold text-slate-800">{fmt(data.fuel.prepaidPetrol)} L</span>
              </div>
              <div className="mt-1.5 bg-slate-200 rounded-full h-2 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min((data.fuel.prepaidPetrol / 8000) * 100, 100)}%` }} />
              </div>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
              <p className="text-[10px] text-amber-600 uppercase font-semibold mb-1">Fuel Breakdown</p>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Diesel used</span>
                <span className="font-medium">{fmt(data.fuel.dieselUsed)} L</span>
              </div>
              <div className="flex justify-between text-xs mt-0.5">
                <span className="text-slate-600">Petrol used</span>
                <span className="font-medium">{fmt(data.fuel.petrolUsed)} L</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Consumers + Upcoming Services */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border border-slate-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-red-500" />
              Top Fuel Consumers
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.fuel.topConsumers.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No data</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {data.fuel.topConsumers.map((v, i) => (
                  <div key={v.vehicleId} className="px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 cursor-pointer" onClick={() => router.push(`/fleet/vehicles/${v.vehicleId}/profile`)}>
                    <span className="text-xs font-bold text-slate-300 w-5">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800">{v.plateNumber}</p>
                      <p className="text-[10px] text-slate-400">{v.make} {v.model}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-800">{fmt(v.quantity)} L</p>
                      <p className="text-[10px] text-slate-400">${fmt(v.cost)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border border-slate-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Upcoming Services
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.services.upcoming.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No upcoming services</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {data.services.upcoming.map((s: any) => (
                  <div key={s.id} className="px-4 py-2.5 hover:bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-800">{s.vehicle?.plateNumber} — {s.serviceType}</p>
                        <p className="text-[10px] text-slate-400">{s.description || 'No description'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-amber-600 font-medium">
                          {s.nextServiceDate ? new Date(s.nextServiceDate).toLocaleDateString() : '—'}
                        </p>
                        {s.nextServiceOdometer && (
                          <p className="text-[10px] text-slate-400">{s.nextServiceOdometer.toLocaleString()} km</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Trips + Recent Fuel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border border-slate-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Navigation className="h-4 w-4 text-mine-blue-500" />
              Recent Trips
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => router.push('/fleet/hauling')}>
              View all <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {data.trips.recent.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No trips yet</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {data.trips.recent.map((t: any) => (
                  <div key={t.id} className="px-4 py-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-800">{t.vehicle?.plateNumber} — {t.driverName}</p>
                        <p className="text-[10px] text-slate-400">{t.sourceWarehouseName} → {t.destinationBranchName}</p>
                      </div>
                      {getStatusBadge(t.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border border-slate-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Fuel className="h-4 w-4 text-amber-500" />
              Recent Fuel Records
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => router.push('/fleet/fuel-logs')}>
              View all <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {data.fuel.recent.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No fuel records yet</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {data.fuel.recent.map((r: any) => (
                  <div key={r.id} className="px-4 py-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-800">{r.vehicle?.plateNumber} — {r.fuelType || '—'}</p>
                        <p className="text-[10px] text-slate-400">{new Date(r.refuelDate).toLocaleDateString()} · {r.vendor || '—'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-800">{fmt(r.quantity)} L</p>
                        <p className="text-[10px] text-slate-400">${fmt(r.totalCost)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

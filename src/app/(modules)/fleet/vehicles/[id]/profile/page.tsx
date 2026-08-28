'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import {
  Truck, ArrowLeft, Fuel, Wrench, MapPin, Navigation, DollarSign,
  Calendar, Gauge, TrendingUp, Package, AlertTriangle, ChevronDown, ChevronUp, Plus, Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface VehicleProfileData {
  vehicle: any;
  fuelRecords: any[];
  dispatches: any[];
  summary: {
    totalFuelUsed: number;
    totalFuelCost: number;
    totalServiceCost: number;
    totalTrips: number;
    completedTrips: number;
    totalDispatches: number;
    totalDistance: number;
    avgFuelPerTrip: number;
    lastServiceDate: string | null;
    nextServiceDate: string | null;
    nextServiceOdometer: number | null;
    currentOdometer: number;
  };
  fuelByMonth: [string, { quantity: number; cost: number }][];
  tripsByMonth: [string, { total: number; completed: number }][];
}

export default function VehicleProfilePage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.id as string;

  const [data, setData] = useState<VehicleProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'trips' | 'fuel' | 'services'>('overview');
  const [expandedService, setExpandedService] = useState<string | null>(null);

  // Add service form
  const [showAddService, setShowAddService] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    serviceDate: '', serviceType: 'maintenance', description: '', mechanicName: '',
    mechanicContact: '', odometer: '', cost: '', vendor: '', notes: '',
    nextServiceDate: '', nextServiceOdometer: '', serviceIntervalKm: '', serviceIntervalDays: '',
  });
  const [serviceItems, setServiceItems] = useState<{ itemName: string; itemType: string; action: string; quantity: string; unitCost: string; totalCost: string }[]>([]);

  // Add fuel form
  const [showAddFuel, setShowAddFuel] = useState(false);
  const [fuelForm, setFuelForm] = useState({
    refuelDate: '', quantity: '', unitCost: '', odometer: '', fuelType: '', vendor: '', notes: '',
  });

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/fleet/vehicles/${vehicleId}/profile`);
      if (res.ok) {
        setData(await res.json());
      } else {
        toast('Failed to load vehicle profile', 'error');
      }
    } catch {
      toast('Connection error', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [vehicleId]);

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...serviceForm,
        items: serviceItems.filter(i => i.itemName),
      };
      const res = await fetch(`/api/fleet/vehicles/${vehicleId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast('Service record added', 'success');
        setShowAddService(false);
        setServiceForm({ serviceDate: '', serviceType: 'maintenance', description: '', mechanicName: '', mechanicContact: '', odometer: '', cost: '', vendor: '', notes: '', nextServiceDate: '', nextServiceOdometer: '', serviceIntervalKm: '', serviceIntervalDays: '' });
        setServiceItems([]);
        fetchData();
      } else {
        toast('Failed to add service record', 'error');
      }
    } catch {
      toast('Connection error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/fleet/fuel-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fuelForm, vehicleId }),
      });
      if (res.ok) {
        toast('Fuel record added', 'success');
        setShowAddFuel(false);
        setFuelForm({ refuelDate: '', quantity: '', unitCost: '', odometer: '', fuelType: '', vendor: '', notes: '' });
        fetchData();
      } else {
        toast('Failed to add fuel record', 'error');
      }
    } catch {
      toast('Connection error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE': case 'AVAILABLE': return <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">{status}</Badge>;
      case 'IN_TRANSIT': case 'DISPATCHED': return <Badge className="bg-blue-100 text-blue-700 text-[10px] animate-pulse">{status}</Badge>;
      case 'MAINTENANCE': return <Badge className="bg-amber-100 text-amber-700 text-[10px]">{status}</Badge>;
      case 'RETIRED': case 'OUT_OF_SERVICE': return <Badge className="bg-red-100 text-red-700 text-[10px]">{status}</Badge>;
      case 'SCHEDULED': return <Badge className="bg-slate-100 text-slate-600 text-[10px]">{status}</Badge>;
      case 'DELIVERED': return <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">{status}</Badge>;
      default: return <Badge className="text-[10px]">{status}</Badge>;
    }
  };

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-6 w-6 animate-spin text-mine-blue-600" />
    </div>
  );

  if (!data) return (
    <div className="text-center py-12 text-slate-500">Vehicle not found</div>
  );

  const { vehicle, fuelRecords, dispatches, summary, fuelByMonth, tripsByMonth } = data;
  const tabs = [
    { key: 'overview' as const, label: 'Overview', icon: TrendingUp },
    { key: 'trips' as const, label: `Trips (${summary.totalTrips})`, icon: Navigation },
    { key: 'fuel' as const, label: `Fuel (${fuelRecords.length})`, icon: Fuel },
    { key: 'services' as const, label: `Services (${vehicle.services?.length || 0})`, icon: Wrench },
  ];

  const maxFuelQty = Math.max(...fuelByMonth.map(([, d]) => d.quantity), 1);
  const maxTrips = Math.max(...tripsByMonth.map(([, d]) => d.total), 1);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/fleet/vehicles')} className="h-8 w-8 p-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-mine-blue-600" />
            <h1 className="text-lg font-bold text-slate-800">
              {vehicle.plateNumber} — {vehicle.make} {vehicle.model}
            </h1>
            {getStatusBadge(vehicle.status)}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {vehicle.type} • {vehicle.assignedDriver || 'No driver assigned'} • Odometer: {summary.currentOdometer.toLocaleString()} km
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border border-slate-100">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-mine-blue-50 rounded-lg"><Navigation className="h-4 w-4 text-mine-blue-600" /></div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Total Trips</p>
                <p className="text-sm font-bold text-slate-800">{summary.totalTrips} <span className="text-[10px] font-normal text-emerald-600">({summary.completedTrips} done)</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-100">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-cyan-50 rounded-lg"><MapPin className="h-4 w-4 text-cyan-600" /></div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Total Distance</p>
                <p className="text-sm font-bold text-slate-800">{fmt(summary.totalDistance)} km</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-100">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-50 rounded-lg"><Fuel className="h-4 w-4 text-amber-600" /></div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Fuel Used</p>
                <p className="text-sm font-bold text-slate-800">{fmt(summary.totalFuelUsed)} L</p>
                <p className="text-[10px] text-slate-400">KSh {fmt(summary.totalFuelCost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-100">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-red-50 rounded-lg"><DollarSign className="h-4 w-4 text-red-600" /></div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Service Cost</p>
                <p className="text-sm font-bold text-slate-800">KSh {fmt(summary.totalServiceCost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === t.key
                ? 'border-mine-blue-600 text-mine-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Fuel by Month Chart */}
          <Card className="border border-slate-100">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Fuel Consumption by Month</CardTitle></CardHeader>
            <CardContent className="p-4">
              {fuelByMonth.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No fuel data</p>
              ) : (
                <div className="space-y-1.5">
                  {fuelByMonth.slice(-8).map(([month, d]) => (
                    <div key={month} className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 w-16 shrink-0">{month}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                        <div className="bg-amber-400 h-full rounded-full transition-all" style={{ width: `${(d.quantity / maxFuelQty) * 100}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-600 w-16 text-right">{fmt(d.quantity)} L</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trips by Month Chart */}
          <Card className="border border-slate-100">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Trips by Month</CardTitle></CardHeader>
            <CardContent className="p-4">
              {tripsByMonth.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No trip data</p>
              ) : (
                <div className="space-y-1.5">
                  {tripsByMonth.slice(-8).map(([month, d]) => (
                    <div key={month} className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 w-16 shrink-0">{month}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                        <div className="bg-mine-blue-400 h-full rounded-full transition-all" style={{ width: `${(d.total / maxTrips) * 100}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-600 w-16 text-right">{d.total} ({d.completed})</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vehicle Details */}
          <Card className="border border-slate-100">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Vehicle Details</CardTitle></CardHeader>
            <CardContent className="p-4 space-y-2">
              {[
                ['Year', vehicle.year || '—'],
                ['VIN', vehicle.vin || '—'],
                ['Fuel Type', vehicle.fuelType || '—'],
                ['Capacity', vehicle.capacity ? `${vehicle.capacity} L` : '—'],
                ['Insurance', vehicle.insurancePolicy || '—'],
                ['Insurance Expiry', vehicle.insuranceExpiry ? new Date(vehicle.insuranceExpiry).toLocaleDateString() : '—'],
                ['Licence Expiry', vehicle.licenceExpiry ? new Date(vehicle.licenceExpiry).toLocaleDateString() : '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-slate-500">{label}</span>
                  <span className="text-slate-800 font-medium">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Service Reminders */}
          <Card className="border border-slate-100">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Service Reminders</CardTitle></CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                <Calendar className="h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-[10px] text-slate-500">Last Service</p>
                  <p className="text-xs font-medium text-slate-800">{summary.lastServiceDate ? new Date(summary.lastServiceDate).toLocaleDateString() : 'No service recorded'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <div>
                  <p className="text-[10px] text-amber-600">Next Service</p>
                  <p className="text-xs font-medium text-amber-800">
                    {summary.nextServiceDate ? `By ${new Date(summary.nextServiceDate).toLocaleDateString()}` : 'Not scheduled'}
                    {summary.nextServiceOdometer ? ` / at ${summary.nextServiceOdometer.toLocaleString()} km` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                <Gauge className="h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-[10px] text-slate-500">Current Odometer</p>
                  <p className="text-xs font-medium text-slate-800">{summary.currentOdometer.toLocaleString()} km</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'trips' && (
        <Card className="border border-slate-100">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px]">Date</TableHead>
                    <TableHead className="text-[10px]">Driver</TableHead>
                    <TableHead className="text-[10px]">Route</TableHead>
                    <TableHead className="text-[10px]">Status</TableHead>
                    <TableHead className="text-[10px]">Distance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dispatches.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-xs text-slate-400">No trips recorded</TableCell></TableRow>
                  ) : (
                    dispatches.map(d => (
                      <TableRow key={d.id}>
                        <TableCell className="text-[11px]">{new Date(d.dispatchedAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-[11px]">{d.driverName}</TableCell>
                        <TableCell className="text-[11px]">{d.origin} → {d.destination}</TableCell>
                        <TableCell>{getStatusBadge(d.returnedAt ? 'RETURNED' : 'OUT')}</TableCell>
                        <TableCell className="text-[11px]">{d.distanceKm ? `${d.distanceKm} km` : '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'fuel' && (
        <Card className="border border-slate-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Fuel Records</CardTitle>
            <Button size="sm" className="h-7 text-[11px] bg-mine-blue-600 hover:bg-mine-blue-700" onClick={() => setShowAddFuel(true)}>
              <Plus className="h-3 w-3 mr-1" /> Add Fuel
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px]">Date</TableHead>
                    <TableHead className="text-[10px]">Quantity</TableHead>
                    <TableHead className="text-[10px]">Unit Cost</TableHead>
                    <TableHead className="text-[10px]">Total</TableHead>
                    <TableHead className="text-[10px]">Odometer</TableHead>
                    <TableHead className="text-[10px]">Vendor</TableHead>
                    <TableHead className="text-[10px]">Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fuelRecords.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-xs text-slate-400">No fuel records</TableCell></TableRow>
                  ) : (
                    fuelRecords.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="text-[11px]">{new Date(r.refuelDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-[11px] font-medium">{fmt(r.quantity)} L</TableCell>
                        <TableCell className="text-[11px]">KSh {fmt(r.unitCost)}</TableCell>
                        <TableCell className="text-[11px] font-medium">KSh {fmt(r.totalCost)}</TableCell>
                        <TableCell className="text-[11px]">{r.odometer ? `${r.odometer.toLocaleString()} km` : '—'}</TableCell>
                        <TableCell className="text-[11px]">{r.vendor || '—'}</TableCell>
                        <TableCell className="text-[11px]">{r.fuelType || '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'services' && (
        <Card className="border border-slate-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Service History</CardTitle>
            <Button size="sm" className="h-7 text-[11px] bg-mine-blue-600 hover:bg-mine-blue-700" onClick={() => setShowAddService(true)}>
              <Plus className="h-3 w-3 mr-1" /> Add Service
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {(!vehicle.services || vehicle.services.length === 0) ? (
              <p className="text-center py-8 text-xs text-slate-400">No service records</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {vehicle.services.map((s: any) => (
                  <div key={s.id} className="px-4 py-3 hover:bg-slate-50 cursor-pointer" onClick={() => setExpandedService(expandedService === s.id ? null : s.id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-mine-blue-50 rounded-lg"><Wrench className="h-3.5 w-3.5 text-mine-blue-600" /></div>
                        <div>
                          <p className="text-xs font-medium text-slate-800">{s.serviceType} — {s.description || 'No description'}</p>
                          <p className="text-[10px] text-slate-500">{new Date(s.serviceDate).toLocaleDateString()} • KSh {fmt(s.cost)} • {s.vendor || 'No vendor'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {s.items && s.items.length > 0 && (
                          <Badge className="text-[10px] bg-slate-100 text-slate-600">{s.items.length} items</Badge>
                        )}
                        {expandedService === s.id ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                      </div>
                    </div>
                    {expandedService === s.id && s.items && s.items.length > 0 && (
                      <div className="mt-2 ml-8">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-[10px]">Item</TableHead>
                              <TableHead className="text-[10px]">Type</TableHead>
                              <TableHead className="text-[10px]">Action</TableHead>
                              <TableHead className="text-[10px]">Qty</TableHead>
                              <TableHead className="text-[10px]">Unit Cost</TableHead>
                              <TableHead className="text-[10px]">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {s.items.map((item: any) => (
                              <TableRow key={item.id}>
                                <TableCell className="text-[11px]">{item.itemName}</TableCell>
                                <TableCell className="text-[11px]">{item.itemType}</TableCell>
                                <TableCell className="text-[11px]">{item.action}</TableCell>
                                <TableCell className="text-[11px]">{item.quantity}</TableCell>
                                <TableCell className="text-[11px]">KSh {fmt(item.unitCost)}</TableCell>
                                <TableCell className="text-[11px] font-medium">KSh {fmt(item.totalCost)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Service Modal */}
      {showAddService && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm">Add Service Record</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleAddService} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] text-slate-500">Service Date *</Label>
                    <Input type="date" value={serviceForm.serviceDate} onChange={e => setServiceForm(f => ({ ...f, serviceDate: e.target.value }))} className="h-8 text-xs mt-1" required />
                  </div>
                  <div>
                    <Label className="text-[10px] text-slate-500">Service Type *</Label>
                    <select value={serviceForm.serviceType} onChange={e => setServiceForm(f => ({ ...f, serviceType: e.target.value }))} className="w-full text-xs border border-slate-200 rounded-md px-3 py-1.5 mt-1 h-8 bg-white">
                      <option value="maintenance">Maintenance</option>
                      <option value="repair">Repair</option>
                      <option value="inspection">Inspection</option>
                      <option value="oil_change">Oil Change</option>
                      <option value="tire_change">Tire Change</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] text-slate-500">Description</Label>
                  <Input value={serviceForm.description} onChange={e => setServiceForm(f => ({ ...f, description: e.target.value }))} className="h-8 text-xs mt-1" placeholder="What was done" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] text-slate-500">Mechanic Name</Label>
                    <Input value={serviceForm.mechanicName} onChange={e => setServiceForm(f => ({ ...f, mechanicName: e.target.value }))} className="h-8 text-xs mt-1" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-slate-500">Mechanic Contact</Label>
                    <Input value={serviceForm.mechanicContact} onChange={e => setServiceForm(f => ({ ...f, mechanicContact: e.target.value }))} className="h-8 text-xs mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] text-slate-500">Odometer (km)</Label>
                    <Input type="number" value={serviceForm.odometer} onChange={e => setServiceForm(f => ({ ...f, odometer: e.target.value }))} className="h-8 text-xs mt-1" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-slate-500">Cost (KSh) *</Label>
                    <Input type="number" step="0.01" value={serviceForm.cost} onChange={e => setServiceForm(f => ({ ...f, cost: e.target.value }))} className="h-8 text-xs mt-1" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] text-slate-500">Vendor</Label>
                    <Input value={serviceForm.vendor} onChange={e => setServiceForm(f => ({ ...f, vendor: e.target.value }))} className="h-8 text-xs mt-1" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-slate-500">Notes</Label>
                    <Input value={serviceForm.notes} onChange={e => setServiceForm(f => ({ ...f, notes: e.target.value }))} className="h-8 text-xs mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] text-slate-500">Next Service Date</Label>
                    <Input type="date" value={serviceForm.nextServiceDate} onChange={e => setServiceForm(f => ({ ...f, nextServiceDate: e.target.value }))} className="h-8 text-xs mt-1" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-slate-500">Next Service Odometer</Label>
                    <Input type="number" value={serviceForm.nextServiceOdometer} onChange={e => setServiceForm(f => ({ ...f, nextServiceOdometer: e.target.value }))} className="h-8 text-xs mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] text-slate-500">Service Interval (km)</Label>
                    <Input type="number" value={serviceForm.serviceIntervalKm} onChange={e => setServiceForm(f => ({ ...f, serviceIntervalKm: e.target.value }))} className="h-8 text-xs mt-1" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-slate-500">Service Interval (days)</Label>
                    <Input type="number" value={serviceForm.serviceIntervalDays} onChange={e => setServiceForm(f => ({ ...f, serviceIntervalDays: e.target.value }))} className="h-8 text-xs mt-1" />
                  </div>
                </div>

                {/* Items */}
                <div className="border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-[10px] text-slate-500 font-bold">Parts / Items Replaced</Label>
                    <Button type="button" variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => setServiceItems(prev => [...prev, { itemName: '', itemType: 'part', action: 'replaced', quantity: '1', unitCost: '', totalCost: '' }])}>
                      <Plus className="h-3 w-3 mr-1" /> Add Item
                    </Button>
                  </div>
                  {serviceItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-6 gap-2 mb-2 items-end">
                      <div className="col-span-2">
                        <Input placeholder="Item name" value={item.itemName} onChange={e => { const v = [...serviceItems]; v[idx].itemName = e.target.value; setServiceItems(v); }} className="h-7 text-[11px]" />
                      </div>
                      <div>
                        <select value={item.itemType} onChange={e => { const v = [...serviceItems]; v[idx].itemType = e.target.value; setServiceItems(v); }} className="w-full text-[11px] border border-slate-200 rounded px-2 py-1 h-7 bg-white">
                          <option value="part">Part</option>
                          <option value="labor">Labor</option>
                          <option value="fluid">Fluid</option>
                          <option value="consumable">Consumable</option>
                        </select>
                      </div>
                      <div>
                        <select value={item.action} onChange={e => { const v = [...serviceItems]; v[idx].action = e.target.value; setServiceItems(v); }} className="w-full text-[11px] border border-slate-200 rounded px-2 py-1 h-7 bg-white">
                          <option value="replaced">Replaced</option>
                          <option value="repaired">Repaired</option>
                          <option value="serviced">Serviced</option>
                          <option value="cleaned">Cleaned</option>
                        </select>
                      </div>
                      <div>
                        <Input type="number" placeholder="Qty" value={item.quantity} onChange={e => { const v = [...serviceItems]; v[idx].quantity = e.target.value; setServiceItems(v); }} className="h-7 text-[11px]" />
                      </div>
                      <div>
                        <Input type="number" step="0.01" placeholder="Cost" value={item.unitCost} onChange={e => {
                          const v = [...serviceItems]; v[idx].unitCost = e.target.value;
                          v[idx].totalCost = (parseFloat(v[idx].unitCost) * parseInt(v[idx].quantity || '1')).toString();
                          setServiceItems(v);
                        }} className="h-7 text-[11px]" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowAddService(false)} className="h-8 text-xs">Cancel</Button>
                  <Button type="submit" size="sm" className="h-8 text-xs bg-mine-blue-600 hover:bg-mine-blue-700" disabled={saving}>
                    {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Save Service
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Fuel Modal */}
      {showAddFuel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm">Add Fuel Record</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleAddFuel} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] text-slate-500">Date *</Label>
                    <Input type="date" value={fuelForm.refuelDate} onChange={e => setFuelForm(f => ({ ...f, refuelDate: e.target.value }))} className="h-8 text-xs mt-1" required />
                  </div>
                  <div>
                    <Label className="text-[10px] text-slate-500">Fuel Type</Label>
                    <select value={fuelForm.fuelType} onChange={e => setFuelForm(f => ({ ...f, fuelType: e.target.value }))} className="w-full text-xs border border-slate-200 rounded-md px-3 py-1.5 mt-1 h-8 bg-white">
                      <option value="Diesel">Diesel</option>
                      <option value="Petrol">Petrol</option>
                      <option value="LPG">LPG</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] text-slate-500">Quantity (L) *</Label>
                    <Input type="number" step="0.01" value={fuelForm.quantity} onChange={e => setFuelForm(f => ({ ...f, quantity: e.target.value }))} className="h-8 text-xs mt-1" required />
                  </div>
                  <div>
                    <Label className="text-[10px] text-slate-500">Unit Cost (KSh) *</Label>
                    <Input type="number" step="0.01" value={fuelForm.unitCost} onChange={e => setFuelForm(f => ({ ...f, unitCost: e.target.value }))} className="h-8 text-xs mt-1" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] text-slate-500">Odometer (km)</Label>
                    <Input type="number" value={fuelForm.odometer} onChange={e => setFuelForm(f => ({ ...f, odometer: e.target.value }))} className="h-8 text-xs mt-1" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-slate-500">Vendor</Label>
                    <Input value={fuelForm.vendor} onChange={e => setFuelForm(f => ({ ...f, vendor: e.target.value }))} className="h-8 text-xs mt-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] text-slate-500">Notes</Label>
                  <Input value={fuelForm.notes} onChange={e => setFuelForm(f => ({ ...f, notes: e.target.value }))} className="h-8 text-xs mt-1" />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowAddFuel(false)} className="h-8 text-xs">Cancel</Button>
                  <Button type="submit" size="sm" className="h-8 text-xs bg-mine-blue-600 hover:bg-mine-blue-700" disabled={saving}>
                    {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Save Fuel Record
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

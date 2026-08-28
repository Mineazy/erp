'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { ArrowLeftRight, Truck, Navigation, CheckCircle, Eye, Search, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';
import { useNetwork } from '@/lib/hooks/use-network';
import { cacheData, getCachedData, saveOfflineTransaction } from '@/lib/db';

interface Vehicle {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  assignedDriver?: string;
}

interface HaulingTrip {
  id: string;
  vehicleId: string;
  vehicle: Vehicle;
  driverName: string;
  sourceWarehouseName: string;
  destinationBranchName: string;
  status: string;
  productDetails: string;
  departureTime: string | null;
  arrivalTime: string | null;
  createdAt: string;
}

export default function HaulingTripsPage() {
  const { isOnline } = useNetwork();
  const [trips, setTrips] = useState<HaulingTrip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<string[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [inTransitOrders, setInTransitOrders] = useState<{ id: string; transferNo: string; toBranch: { name: string } | null; lines: { productName: string; quantity: number; sentQty: number | null }[] }[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [driverName, setDriverName] = useState('');
  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [destBranchIds, setDestBranchIds] = useState<string[]>([]);
  const [cargoOrderIds, setCargoOrderIds] = useState<string[]>([]);
  const [viewOrder, setViewOrder] = useState<typeof inTransitOrders[number] | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  // Filter, search & pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDriver, setFilterDriver] = useState('');
  const [filterRoute, setFilterRoute] = useState('');
  const [filterCargo, setFilterCargo] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const PAGE_SIZE = 10;

  // Unique values for filter dropdowns
  const uniqueRoutes = Array.from(new Set(trips.map(t => `${t.sourceWarehouseName} → ${t.destinationBranchName}`)));
  const uniqueCargoDetails = Array.from(new Set(trips.map(t => t.productDetails).filter(Boolean)));
  const uniqueStatuses = Array.from(new Set(trips.map(t => t.status)));

  const filteredTrips = trips.filter(t => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || t.driverName.toLowerCase().includes(q) || t.vehicle.plateNumber.toLowerCase().includes(q) || t.sourceWarehouseName.toLowerCase().includes(q) || t.destinationBranchName.toLowerCase().includes(q) || t.productDetails.toLowerCase().includes(q) || t.status.toLowerCase().includes(q);
    const matchesDriver = !filterDriver || t.driverName === filterDriver;
    const matchesRoute = !filterRoute || `${t.sourceWarehouseName} → ${t.destinationBranchName}` === filterRoute;
    const matchesCargo = !filterCargo || t.productDetails === filterCargo;
    const matchesStatus = !filterStatus || t.status === filterStatus;
    const dispatchDate = t.departureTime || t.createdAt;
    const matchesDateFrom = !filterDateFrom || new Date(dispatchDate) >= new Date(filterDateFrom);
    const matchesDateTo = !filterDateTo || new Date(dispatchDate) <= new Date(filterDateTo + 'T23:59:59');
    return matchesSearch && matchesDriver && matchesRoute && matchesCargo && matchesStatus && matchesDateFrom && matchesDateTo;
  });

  const totalPages = Math.max(1, Math.ceil(filteredTrips.length / PAGE_SIZE));
  const paginatedTrips = filteredTrips.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const activeFilterCount = [filterDriver, filterRoute, filterCargo, filterStatus, filterDateFrom, filterDateTo].filter(Boolean).length;

  const clearFilters = () => {
    setSearchQuery('');
    setFilterDriver('');
    setFilterRoute('');
    setFilterCargo('');
    setFilterStatus('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setCurrentPage(1);
  };

  const fetchData = async () => {
    try {
      if (!isOnline) {
        const cachedVehicles = await getCachedData('fleet_vehicles_cache');
        if (cachedVehicles.length > 0) setVehicles(cachedVehicles);
        setLoading(false);
        return;
      }
      
      const [tripsRes, vehiclesRes, warehousesRes, branchesRes, ordersRes] = await Promise.all([
        fetch('/api/fleet/hauling'),
        fetch('/api/fleet/vehicles'),
        fetch('/api/warehouse'),
        fetch('/api/admin/branches'),
        fetch('/api/inventory/branch-orders?status=in_transit&limit=200'),
      ]);
      if (tripsRes.ok) setTrips(await tripsRes.json());
      if (vehiclesRes.ok) {
        const vehiclesData = await vehiclesRes.json();
        setVehicles(vehiclesData);
        const uniqueDrivers = Array.from(new Set(vehiclesData.map((v: Vehicle) => v.assignedDriver).filter(Boolean))) as string[];
        setDrivers(uniqueDrivers);
        if (isOnline) await cacheData('fleet_vehicles_cache', vehiclesData);
      }
      if (warehousesRes.ok) {
        const wd = await warehousesRes.json();
        setWarehouses(Array.isArray(wd) ? wd : wd.items || []);
      }
      if (branchesRes.ok) {
        const bd = await branchesRes.json();
        setBranches(Array.isArray(bd) ? bd : bd.items || []);
      }
      if (ordersRes.ok) {
        const od = await ordersRes.json();
        setInTransitOrders(od.items || []);
      }
    } catch (_) {
      toast('Failed to load hauling trips', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterDriver, filterRoute, filterCargo, filterStatus, filterDateFrom, filterDateTo]);

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle || !driverName || !sourceWarehouseId || destBranchIds.length === 0 || cargoOrderIds.length === 0) {
      toast('Please complete all form fields', 'warning');
      return;
    }

    const selectedWarehouse = warehouses.find(w => w.id === sourceWarehouseId);
    const selectedBranches = branches.filter(b => destBranchIds.includes(b.id));
    const selectedOrders = inTransitOrders.filter(o => cargoOrderIds.includes(o.id));
    const cargoSummary = selectedOrders.map(o => `${o.transferNo} — ${o.toBranch?.name || 'N/A'}`).join('; ');
    
    const payload = {
      action: 'create',
      vehicleId: selectedVehicle,
      driverName,
      sourceWarehouseId,
      sourceWarehouseName: selectedWarehouse?.name || '',
      destinationBranchId: destBranchIds[0],
      destinationBranchName: selectedBranches.map(b => b.name).join(', '),
      productDetails: cargoSummary
    };

    if (!isOnline) {
      try {
        await saveOfflineTransaction({
          id: crypto.randomUUID(),
          type: 'fleet_hauling',
          payload,
          timestamp: Date.now(),
          status: 'pending'
        });
        toast('Offline hauling trip saved locally', 'success');
        
        const veh = vehicles.find(v => v.id === selectedVehicle);
        const simTrip: HaulingTrip = {
          id: `off-${Date.now()}`,
          vehicleId: selectedVehicle,
          vehicle: veh || { id: '', plateNumber: 'Offline', make: '', model: '' },
          driverName,
          sourceWarehouseName: selectedWarehouse?.name || '',
          destinationBranchName: selectedBranches.map(b => b.name).join(', '),
          status: 'SCHEDULED',
          productDetails: cargoSummary,
          departureTime: null,
          arrivalTime: null,
          createdAt: new Date().toISOString()
        };
        setTrips(prev => [simTrip, ...prev]);
        
        setSelectedVehicle('');
        setDriverName('');
        setSourceWarehouseId('');
        setDestBranchIds([]);
        setCargoOrderIds([]);
      } catch {
        toast('Failed to save offline trip', 'error');
      }
      return;
    }

    try {
      const res = await fetch('/api/fleet/hauling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast('Hauling trip scheduled successfully', 'success');
        setSelectedVehicle('');
        setDriverName('');
        setSourceWarehouseId('');
        setDestBranchIds([]);
        setCargoOrderIds([]);
        fetchData();
      } else {
        toast('Failed to schedule trip', 'error');
      }
    } catch (_) {
      toast('Connection error', 'error');
    }
  };

  const handleUpdateTripStatus = async (id: string, action: 'start' | 'deliver') => {
    try {
      const res = await fetch('/api/fleet/hauling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, tripId: id })
      });
      if (res.ok) {
        toast(action === 'start' ? 'Transit started' : 'Trip delivered & logged', 'success');
        fetchData();
      } else {
        toast('Failed to update trip status', 'error');
      }
    } catch (_) {
      toast('Connection error', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SCHEDULED':
        return <Badge variant="secondary">Scheduled</Badge>;
      case 'IN_TRANSIT':
        return <Badge variant="warning" className="animate-pulse">In Transit</Badge>;
      case 'DELIVERED':
        return <Badge variant="success">Delivered</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ArrowLeftRight className="h-6 w-6 text-mine-blue-800" />
          Hauling & Logistics (Warehouse to Shops)
        </h2>
        <p className="text-slate-500 mt-1">Schedule and monitor heavy haulage trucks dispatch cargo logs between warehouses and branch outlets</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trips logs */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Logistics Haulage Ledger</CardTitle>
                <div className="flex items-center gap-2">
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">{activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}</Badge>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="h-7 text-xs gap-1">
                    <Filter className="h-3 w-3" />
                    Filters
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by driver, vehicle, route, cargo, status..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Filter panel */}
              {showFilters && (
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-3">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Driver</label>
                      <select value={filterDriver} onChange={(e) => setFilterDriver(e.target.value)} className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-mine-blue-500">
                        <option value="">All Drivers</option>
                        {drivers.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Route</label>
                      <select value={filterRoute} onChange={(e) => setFilterRoute(e.target.value)} className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-mine-blue-500">
                        <option value="">All Routes</option>
                        {uniqueRoutes.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Cargo Details</label>
                      <select value={filterCargo} onChange={(e) => setFilterCargo(e.target.value)} className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-mine-blue-500">
                        <option value="">All Cargo</option>
                        {uniqueCargoDetails.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Status</label>
                      <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-mine-blue-500">
                        <option value="">All Statuses</option>
                        {uniqueStatuses.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Date From</label>
                      <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-mine-blue-500" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Date To</label>
                      <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-mine-blue-500" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[10px] text-slate-400">{filteredTrips.length} result{filteredTrips.length !== 1 ? 's' : ''} found</p>
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50 gap-1">
                      <X className="h-3 w-3" />
                      Clear Filters
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Date of Dispatch</TableHead>
                    <TableHead>Route (Source &rarr; Shop)</TableHead>
                    <TableHead>Cargo Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time Details</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTrips.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-bold text-slate-800">{t.driverName}</TableCell>
                      <TableCell>{t.vehicle.plateNumber}</TableCell>
                      <TableCell className="text-xs text-slate-600 font-mono">
                        {t.departureTime
                          ? new Date(t.departureTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-700">{t.sourceWarehouseName}</span>
                        <span className="mx-1 font-bold text-slate-400">&rarr;</span>
                        <span className="bg-indigo-50 px-1.5 py-0.5 rounded font-mono text-indigo-700">{t.destinationBranchName}</span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 font-mono truncate max-w-[150px]">{t.productDetails}</TableCell>
                      <TableCell>{getStatusBadge(t.status)}</TableCell>
                      <TableCell className="text-[10px] text-slate-500 space-y-0.5 font-mono">
                        {t.departureTime && <p>Dep: {new Date(t.departureTime).toLocaleTimeString()}</p>}
                        {t.arrivalTime && <p>Arr: {new Date(t.arrivalTime).toLocaleTimeString()}</p>}
                        {!t.departureTime && <p className="italic text-slate-400">Not departed</p>}
                      </TableCell>
                      <TableCell className="text-right">
                        {t.status === 'SCHEDULED' && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateTripStatus(t.id, 'start')}
                            className="h-8 text-xs font-semibold gap-1 bg-amber-500 hover:bg-amber-600 text-white"
                          >
                            <Navigation className="h-3 w-3" />
                            Start Transit
                          </Button>
                        )}
                        {t.status === 'IN_TRANSIT' && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateTripStatus(t.id, 'deliver')}
                            className="h-8 text-xs font-semibold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CheckCircle className="h-3 w-3" />
                            Confirm Delivery
                          </Button>
                        )}
                        {t.status === 'DELIVERED' && (
                          <span className="text-xs text-slate-400 font-medium flex items-center justify-end gap-1">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                            Completed
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredTrips.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                        {trips.length === 0 ? 'No trips dispatched yet' : 'No trips match your search or filters'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {/* Pagination */}
              {filteredTrips.length > PAGE_SIZE && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                  <p className="text-[10px] text-slate-400">
                    Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filteredTrips.length)} of {filteredTrips.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-7 w-7 p-0">
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .reduce<(number | string)[]>((acc, p, i, arr) => {
                        if (i > 0 && typeof arr[i - 1] === 'number' && (p as number) - (arr[i - 1] as number) > 1) acc.push('...');
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) =>
                        typeof p === 'string' ? (
                          <span key={`dots-${i}`} className="text-xs text-slate-400 px-1">…</span>
                        ) : (
                          <Button
                            key={p}
                            variant={currentPage === p ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCurrentPage(p)}
                            className={`h-7 w-7 p-0 text-[10px] ${currentPage === p ? 'bg-mine-blue-700 hover:bg-mine-blue-800 text-white' : ''}`}
                          >
                            {p}
                          </Button>
                        )
                      )}
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-7 w-7 p-0">
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Dispatch Hauling form */}
        <Card className="self-start">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-lg">Dispatch Cargo Truck</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <form onSubmit={handleCreateTrip} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Select Truck</label>
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                >
                  <option value="">-- Choose Truck --</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plateNumber} ({v.make} {v.model})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Driver Name</label>
                <select
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                >
                  <option value="">-- Choose Driver --</option>
                  {drivers.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Source Warehouse</label>
                  <select
                    value={sourceWarehouseId}
                    onChange={(e) => setSourceWarehouseId(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                  >
                    <option value="">-- Select Warehouse --</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Destination Shop</label>
                  <select
                    multiple
                    value={destBranchIds}
                    onChange={(e) => setDestBranchIds(Array.from(e.target.selectedOptions, o => o.value))}
                    className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800 min-h-[80px]"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  {destBranchIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {destBranchIds.map(id => {
                        const b = branches.find(br => br.id === id);
                        return b ? (
                          <span key={id} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {b.name}
                            <button type="button" onClick={() => setDestBranchIds(destBranchIds.filter(x => x !== id))} className="text-indigo-400 hover:text-indigo-700">&times;</button>
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Press the CTRL Button to select more than 1 Destination shop</p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Cargo Details / Manifest</label>
                <select
                  multiple
                  value={cargoOrderIds}
                  onChange={(e) => setCargoOrderIds(Array.from(e.target.selectedOptions, o => o.value))}
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800 min-h-[80px]"
                >
                  {inTransitOrders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.transferNo} — {order.toBranch?.name || 'N/A'}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">Press CTRL Button to select more than 1 Cargo Details/Manifest</p>
                {cargoOrderIds.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {cargoOrderIds.map(id => {
                      const order = inTransitOrders.find(o => o.id === id);
                      return order ? (
                        <span key={id} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {order.transferNo} — {order.toBranch?.name || 'N/A'}
                          <button type="button" onClick={() => setCargoOrderIds(cargoOrderIds.filter(x => x !== id))} className="text-emerald-400 hover:text-emerald-700">&times;</button>
                          <button type="button" onClick={() => { setViewOrder(order); setViewModalOpen(true); }} className="text-emerald-500 hover:text-emerald-800 ml-0.5">
                            <Eye className="h-3 w-3" />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full font-bold">Dispatch Trip</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* View Branch Order Modal */}
      <Dialog open={viewModalOpen} onClose={() => setViewModalOpen(false)} size="lg">
        <div className="p-6">
          <h3 className="text-lg font-bold mb-4">Branch Order: {viewOrder?.transferNo}</h3>
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <p className="text-slate-500 font-medium">To Branch</p>
              <p>{viewOrder?.toBranch?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">Status</p>
              <p className="font-semibold text-blue-700">IN TRANSIT</p>
            </div>
          </div>
          <div className="border rounded-md overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">Product</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Requested</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {viewOrder?.lines?.map((line, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">{line.productName}</td>
                    <td className="px-3 py-2 text-right font-mono">{Number(line.quantity)}</td>
                    <td className="px-3 py-2 text-right font-mono">{line.sentQty !== null ? Number(line.sentQty) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewModalOpen(false)}>Close</Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}

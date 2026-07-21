'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { ArrowLeftRight, Truck, Navigation, CheckCircle } from 'lucide-react';
import { useNetwork } from '@/lib/hooks/use-network';
import { cacheData, getCachedData, saveOfflineTransaction } from '@/lib/db';

interface Vehicle {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
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
  const [loading, setLoading] = useState(true);

  // Form states
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [driverName, setDriverName] = useState('');
  const [sourceWarehouse, setSourceWarehouse] = useState('');
  const [destBranch, setDestBranch] = useState('');
  const [cargoDetails, setCargoDetails] = useState('');

  const fetchData = async () => {
    try {
      if (!isOnline) {
        const cachedVehicles = await getCachedData('fleet_vehicles_cache');
        if (cachedVehicles.length > 0) setVehicles(cachedVehicles);
        setLoading(false);
        return;
      }
      
      const [tripsRes, vehiclesRes] = await Promise.all([
        fetch('/api/fleet/hauling'),
        fetch('/api/fleet/vehicles')
      ]);
      if (tripsRes.ok && vehiclesRes.ok) {
        const tripsData = await tripsRes.json();
        const vehiclesData = await vehiclesRes.json();
        setTrips(tripsData);
        setVehicles(vehiclesData);
        
        if (isOnline) {
          await cacheData('fleet_vehicles_cache', vehiclesData);
        }
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

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle || !driverName || !sourceWarehouse || !destBranch || !cargoDetails) {
      toast('Please complete all form fields', 'warning');
      return;
    }
    
    const payload = {
      action: 'create',
      vehicleId: selectedVehicle,
      driverName,
      sourceWarehouseName: sourceWarehouse,
      destinationBranchName: destBranch,
      productDetails: cargoDetails
    };

    if (!isOnline) {
      try {
        await saveOfflineTransaction({
          id: crypto.randomUUID(),
          type: 'fleet_hauling',
          payload,
          timestamp: Date.now()
        });
        toast('Offline hauling trip saved locally', 'success');
        
        const veh = vehicles.find(v => v.id === selectedVehicle);
        const simTrip: HaulingTrip = {
          id: `off-${Date.now()}`,
          vehicleId: selectedVehicle,
          vehicle: veh || { id: '', plateNumber: 'Offline', make: '', model: '' },
          driverName,
          sourceWarehouseName: sourceWarehouse,
          destinationBranchName: destBranch,
          status: 'SCHEDULED',
          productDetails: cargoDetails,
          departureTime: null,
          arrivalTime: null,
          createdAt: new Date().toISOString()
        };
        setTrips(prev => [simTrip, ...prev]);
        
        setSelectedVehicle('');
        setDriverName('');
        setSourceWarehouse('');
        setDestBranch('');
        setCargoDetails('');
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
        setSourceWarehouse('');
        setDestBranch('');
        setCargoDetails('');
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
              <CardTitle className="text-lg">Logistics Haulage Ledger</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Route (Source &rarr; Shop)</TableHead>
                    <TableHead>Cargo Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time Details</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trips.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-bold text-slate-800">{t.driverName}</TableCell>
                      <TableCell>{t.vehicle.plateNumber}</TableCell>
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
                  {trips.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-400">No trips dispatched yet</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
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
                <input
                  type="text"
                  placeholder="e.g. Arthur Dent"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Source Warehouse</label>
                  <input
                    type="text"
                    placeholder="WH-EAST"
                    value={sourceWarehouse}
                    onChange={(e) => setSourceWarehouse(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Destination Shop</label>
                  <input
                    type="text"
                    placeholder="Harare Shop"
                    value={destBranch}
                    onChange={(e) => setDestBranch(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Cargo Details / Manifest</label>
                <textarea
                  rows={3}
                  placeholder="e.g. 50x Copper bars, 12x Engine pistons"
                  value={cargoDetails}
                  onChange={(e) => setCargoDetails(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                />
              </div>
              <Button type="submit" className="w-full font-bold">Dispatch Trip</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

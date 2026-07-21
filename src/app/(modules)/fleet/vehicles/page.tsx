'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { Truck, MapPin, Navigation, Settings, Play, CheckCircle } from 'lucide-react';

interface Vehicle {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  type: string;
  status: string;
  assignedDriver: string;
  currentOdometer: number;
  latitude: number;
  longitude: number;
  speed: number;
  lastPing: string;
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulateRunning, setSimulateRunning] = useState(false);
  const [newVehiclePlate, setNewVehiclePlate] = useState('');
  const [newVehicleMake, setNewVehicleMake] = useState('');
  const [newVehicleModel, setNewVehicleModel] = useState('');
  const [newVehicleDriver, setNewVehicleDriver] = useState('');

  const fetchVehicles = async () => {
    try {
      const res = await fetch('/api/fleet/vehicles');
      if (res.ok) {
        const data = await res.json();
        setVehicles(data);
      }
    } catch (_) {
      toast('Failed to load fleet vehicles', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  // Simulates movements by pinging API in intervals
  useEffect(() => {
    let timer: any = null;
    if (simulateRunning) {
      timer = setInterval(async () => {
        for (const v of vehicles) {
          try {
            await fetch('/api/fleet/vehicles', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ vehicleId: v.id, simulateMove: true })
            });
          } catch (_) {}
        }
        fetchVehicles();
      }, 3000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [simulateRunning, vehicles]);

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehiclePlate || !newVehicleMake || !newVehicleModel) {
      toast('Please enter plate number, make, and model', 'warning');
      return;
    }
    try {
      const res = await fetch('/api/fleet/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plateNumber: newVehiclePlate,
          make: newVehicleMake,
          model: newVehicleModel,
          assignedDriver: newVehicleDriver || 'Unassigned',
          currentOdometer: 1000
        })
      });
      if (res.ok) {
        toast('Vehicle registered successfully', 'success');
        setNewVehiclePlate('');
        setNewVehicleMake('');
        setNewVehicleModel('');
        setNewVehicleDriver('');
        fetchVehicles();
      } else {
        toast('Failed to register vehicle', 'error');
      }
    } catch (_) {
      toast('Connection error', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <Badge variant="success">Active (Ready)</Badge>;
      case 'in_transit':
        return <Badge variant="warning">In Transit</Badge>;
      case 'maintenance':
        return <Badge variant="destructive">Maintenance</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="h-6 w-6 text-mine-blue-800" />
            Vehicles & Live Tracking
          </h2>
          <p className="text-slate-500 mt-1">Manage fleet assets, monitor live telemetry locations, and simulate GPS tracking</p>
        </div>
        <Button
          onClick={() => setSimulateRunning(!simulateRunning)}
          variant={simulateRunning ? 'destructive' : 'default'}
          className="gap-2 font-semibold shadow-md"
        >
          <Play className={simulateRunning ? 'animate-spin h-4 w-4' : 'h-4 w-4'} />
          {simulateRunning ? 'Stop Live GPS Feed' : 'Start Live GPS Feed'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vehicles List */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-lg">Fleet Registry</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plate</TableHead>
                    <TableHead>Make/Model</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Odometer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Telemetry (GPS)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-bold text-slate-800">{v.plateNumber}</TableCell>
                      <TableCell>{v.make} {v.model}</TableCell>
                      <TableCell>{v.assignedDriver}</TableCell>
                      <TableCell>{Number(v.currentOdometer).toLocaleString()} km</TableCell>
                      <TableCell>{getStatusBadge(v.status)}</TableCell>
                      <TableCell>
                        <div className="text-xs text-slate-500 space-y-0.5 font-mono">
                          <p>Lat: {Number(v.latitude || 0).toFixed(4)}</p>
                          <p>Lng: {Number(v.longitude || 0).toFixed(4)}</p>
                          <p>Speed: {v.speed || 0} km/h</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {vehicles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-400">Loading vehicles...</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Integrated Simulated Tracking Map */}
          <Card className="overflow-hidden shadow-lg border-2 border-slate-150">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50">
              <CardTitle className="text-base font-bold text-slate-700 flex items-center gap-2">
                <Navigation className="h-5 w-5 text-mine-blue-700" />
                Live GPS Telemetry Tracker Map (Zimbabwe Core Route)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 bg-slate-900 text-white relative min-h-[300px] flex flex-col justify-between">
              {/* Map grid representation */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 to-slate-950 opacity-90 grid grid-cols-10 grid-rows-6 pointer-events-none">
                {Array.from({ length: 60 }).map((_, i) => (
                  <div key={i} className="border-[0.5px] border-slate-800/35" />
                ))}
              </div>

              {/* Highway representation line */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 500 300">
                <path d="M 50 100 Q 250 200 450 100" fill="none" stroke="#334155" strokeWidth="6" strokeDasharray="5" />
                <path d="M 50 100 Q 250 200 450 100" fill="none" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3" className="animate-[dash_2s_linear_infinite]" />
              </svg>

              {/* Live coordinates markers */}
              {vehicles.map((v, idx) => {
                // Map latitude/longitude to clean map offsets
                // Zimbabwe bounds approx: Lat -22 to -15, Lng 25 to 33
                const latPercent = Math.min(100, Math.max(0, ((-15 - v.latitude) / 7) * 100));
                const lngPercent = Math.min(100, Math.max(0, ((v.longitude - 25) / 8) * 100));

                return (
                  <div
                    key={v.id}
                    className="absolute transition-all duration-1000 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group z-10"
                    style={{ top: `${latPercent}%`, left: `${lngPercent}%` }}
                  >
                    <div className="relative">
                      <div className="absolute -inset-2 bg-indigo-500 rounded-full animate-ping opacity-25" />
                      <MapPin className={cn(
                        "h-6 w-6 filter drop-shadow-md",
                        v.status === 'in_transit' ? 'text-amber-400' : 'text-emerald-400'
                      )} />
                    </div>
                    <span className="mt-1 bg-slate-900/90 text-[10px] font-bold font-mono px-2 py-0.5 rounded border border-slate-700 whitespace-nowrap shadow-md">
                      {v.plateNumber} ({v.speed} km/h)
                    </span>
                  </div>
                );
              })}

              <div className="z-10 mt-auto text-xs text-slate-400 font-mono bg-slate-950/80 p-2.5 rounded border border-slate-800">
                <p className="text-white font-bold mb-1">Live Map Feed logs:</p>
                {vehicles.map((v) => (
                  <p key={v.id}>&gt; Vehicle {v.plateNumber} pinged at [{parseFloat(String(v.latitude || '0')).toFixed(4)}, {parseFloat(String(v.longitude || '0')).toFixed(4)}] - Status: {v.status.toUpperCase()}</p>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Register Vehicle Form */}
        <Card className="self-start">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-lg">Register Asset</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <form onSubmit={handleCreateVehicle} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Plate Number</label>
                <input
                  type="text"
                  placeholder="e.g. HGV-992-ZW"
                  value={newVehiclePlate}
                  onChange={(e) => setNewVehiclePlate(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Make</label>
                <input
                  type="text"
                  placeholder="e.g. Volvo"
                  value={newVehicleMake}
                  onChange={(e) => setNewVehicleMake(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Model</label>
                <input
                  type="text"
                  placeholder="e.g. FH16 Hauler"
                  value={newVehicleModel}
                  onChange={(e) => setNewVehicleModel(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Assigned Driver</label>
                <input
                  type="text"
                  placeholder="e.g. Arthur Dent"
                  value={newVehicleDriver}
                  onChange={(e) => setNewVehicleDriver(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                />
              </div>
              <Button type="submit" className="w-full font-bold">Register Vehicle</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

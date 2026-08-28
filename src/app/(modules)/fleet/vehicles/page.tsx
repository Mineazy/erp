'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { Truck, MapPin, Navigation, Settings, Play, CheckCircle, Eye, Pencil, Trash2, Loader2, BarChart3 } from 'lucide-react';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  year?: number | null;
  vin?: string | null;
  fuelType?: string | null;
  capacity?: number | null;
  insurancePolicy?: string | null;
  insuranceExpiry?: string | null;
  licenceExpiry?: string | null;
}

export default function VehiclesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulateRunning, setSimulateRunning] = useState(false);
  const [newVehiclePlate, setNewVehiclePlate] = useState('');
  const [newVehicleMake, setNewVehicleMake] = useState('');
  const [newVehicleModel, setNewVehicleModel] = useState('');
  const [newVehicleDriver, setNewVehicleDriver] = useState('');

  // View / Edit / Delete state
  const [viewingVehicle, setViewingVehicle] = useState<Vehicle | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    plateNumber: '', make: '', model: '', type: '', status: '',
    assignedDriver: '', currentOdometer: '', year: '', vin: '',
    fuelType: '', capacity: '', insurancePolicy: '', insuranceExpiry: '', licenceExpiry: ''
  });

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

  const openEditDialog = (v: Vehicle) => {
    setEditForm({
      plateNumber: v.plateNumber,
      make: v.make,
      model: v.model,
      type: v.type || 'heavy_truck',
      status: v.status || 'active',
      assignedDriver: v.assignedDriver || '',
      currentOdometer: String(v.currentOdometer || 0),
      year: v.year ? String(v.year) : '',
      vin: v.vin || '',
      fuelType: v.fuelType || '',
      capacity: v.capacity ? String(v.capacity) : '',
      insurancePolicy: v.insurancePolicy || '',
      insuranceExpiry: v.insuranceExpiry ? v.insuranceExpiry.split('T')[0] : '',
      licenceExpiry: v.licenceExpiry ? v.licenceExpiry.split('T')[0] : '',
    });
    setEditingVehicle(v);
  };

  const handleSaveEdit = async () => {
    if (!editingVehicle) return;
    setSaving(true);
    try {
      const res = await fetch('/api/fleet/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit',
          vehicleId: editingVehicle.id,
          ...editForm,
          currentOdometer: editForm.currentOdometer ? Number(editForm.currentOdometer) : undefined,
          year: editForm.year ? Number(editForm.year) : null,
          capacity: editForm.capacity ? Number(editForm.capacity) : null,
        })
      });
      if (res.ok) {
        toast('Vehicle updated successfully', 'success');
        setEditingVehicle(null);
        fetchVehicles();
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to update vehicle', 'error');
      }
    } catch {
      toast('Connection error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingVehicle) return;
    setSaving(true);
    try {
      const res = await fetch('/api/fleet/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', vehicleId: deletingVehicle.id })
      });
      if (res.ok) {
        toast('Vehicle deleted successfully', 'success');
        setDeletingVehicle(null);
        fetchVehicles();
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to delete vehicle', 'error');
      }
    } catch {
      toast('Connection error', 'error');
    } finally {
      setSaving(false);
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
                    <TableHead className="text-right">Actions</TableHead>
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
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => router.push(`/fleet/vehicles/${v.id}/profile`)} className="h-8 p-1.5 text-mine-blue-600 hover:text-mine-blue-700" title="Vehicle Profile">
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setViewingVehicle(v)} className="h-8 p-1.5" title="View Details">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openEditDialog(v)} className="h-8 p-1.5 text-blue-600 hover:text-blue-700" title="Edit Vehicle">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeletingVehicle(v)} className="h-8 p-1.5 text-red-600 hover:text-red-700" title="Delete Vehicle">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {vehicles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-400">Loading vehicles...</TableCell>
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

      {/* View Vehicle Dialog */}
      <Dialog open={!!viewingVehicle} onClose={() => setViewingVehicle(null)} title="Vehicle Details">
        {viewingVehicle && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-500 block">Plate Number</span><span className="font-bold text-slate-900">{viewingVehicle.plateNumber}</span></div>
              <div><span className="text-slate-500 block">Status</span>{getStatusBadge(viewingVehicle.status)}</div>
              <div><span className="text-slate-500 block">Make</span><span className="font-medium text-slate-900">{viewingVehicle.make}</span></div>
              <div><span className="text-slate-500 block">Model</span><span className="font-medium text-slate-900">{viewingVehicle.model}</span></div>
              <div><span className="text-slate-500 block">Type</span><span className="font-medium text-slate-900">{viewingVehicle.type}</span></div>
              <div><span className="text-slate-500 block">Year</span><span className="font-medium text-slate-900">{viewingVehicle.year || '—'}</span></div>
              <div><span className="text-slate-500 block">Assigned Driver</span><span className="font-medium text-slate-900">{viewingVehicle.assignedDriver || '—'}</span></div>
              <div><span className="text-slate-500 block">Odometer</span><span className="font-medium text-slate-900">{Number(viewingVehicle.currentOdometer).toLocaleString()} km</span></div>
              <div><span className="text-slate-500 block">VIN</span><span className="font-medium text-slate-900">{viewingVehicle.vin || '—'}</span></div>
              <div><span className="text-slate-500 block">Fuel Type</span><span className="font-medium text-slate-900">{viewingVehicle.fuelType || '—'}</span></div>
              <div><span className="text-slate-500 block">Capacity</span><span className="font-medium text-slate-900">{viewingVehicle.capacity ? `${viewingVehicle.capacity} L` : '—'}</span></div>
              <div><span className="text-slate-500 block">Insurance Policy</span><span className="font-medium text-slate-900">{viewingVehicle.insurancePolicy || '—'}</span></div>
              <div><span className="text-slate-500 block">Insurance Expiry</span><span className="font-medium text-slate-900">{viewingVehicle.insuranceExpiry ? new Date(viewingVehicle.insuranceExpiry).toLocaleDateString() : '—'}</span></div>
              <div><span className="text-slate-500 block">Licence Expiry</span><span className="font-medium text-slate-900">{viewingVehicle.licenceExpiry ? new Date(viewingVehicle.licenceExpiry).toLocaleDateString() : '—'}</span></div>
            </div>
            <div className="border-t border-slate-100 pt-3 text-xs text-slate-400 space-y-1">
              <p>GPS Lat: {Number(viewingVehicle.latitude || 0).toFixed(6)}</p>
              <p>GPS Lng: {Number(viewingVehicle.longitude || 0).toFixed(6)}</p>
              <p>Speed: {viewingVehicle.speed || 0} km/h</p>
              <p>Last Ping: {viewingVehicle.lastPing ? new Date(viewingVehicle.lastPing).toLocaleString() : '—'}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewingVehicle(null)}>Close</Button>
              <Button onClick={() => { openEditDialog(viewingVehicle); setViewingVehicle(null); }}>Edit</Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>

      {/* Edit Vehicle Dialog */}
      <Dialog open={!!editingVehicle} onClose={() => setEditingVehicle(null)} title="Edit Vehicle">
        {editingVehicle && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>Plate Number</Label><Input value={editForm.plateNumber} onChange={(e) => setEditForm({ ...editForm, plateNumber: e.target.value.toUpperCase() })} /></div>
              <div className="space-y-1"><Label>Make</Label><Input value={editForm.make} onChange={(e) => setEditForm({ ...editForm, make: e.target.value })} /></div>
              <div className="space-y-1"><Label>Model</Label><Input value={editForm.model} onChange={(e) => setEditForm({ ...editForm, model: e.target.value })} /></div>
              <div className="space-y-1"><Label>Type</Label>
                <select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })} className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm">
                  <option value="heavy_truck">Heavy Truck</option><option value="light_vehicle">Light Vehicle</option><option value="equipment">Equipment</option>
                </select>
              </div>
              <div className="space-y-1"><Label>Status</Label>
                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm">
                  <option value="active">Active</option><option value="in_transit">In Transit</option><option value="maintenance">Maintenance</option><option value="retired">Retired</option>
                </select>
              </div>
              <div className="space-y-1"><Label>Assigned Driver</Label><Input value={editForm.assignedDriver} onChange={(e) => setEditForm({ ...editForm, assignedDriver: e.target.value })} /></div>
              <div className="space-y-1"><Label>Odometer (km)</Label><Input type="number" value={editForm.currentOdometer} onChange={(e) => setEditForm({ ...editForm, currentOdometer: e.target.value })} /></div>
              <div className="space-y-1"><Label>Year</Label><Input type="number" value={editForm.year} onChange={(e) => setEditForm({ ...editForm, year: e.target.value })} /></div>
              <div className="space-y-1"><Label>VIN</Label><Input value={editForm.vin} onChange={(e) => setEditForm({ ...editForm, vin: e.target.value })} /></div>
              <div className="space-y-1"><Label>Fuel Type</Label><Input value={editForm.fuelType} onChange={(e) => setEditForm({ ...editForm, fuelType: e.target.value })} placeholder="e.g. Diesel" /></div>
              <div className="space-y-1"><Label>Capacity (L)</Label><Input type="number" value={editForm.capacity} onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })} /></div>
              <div className="space-y-1"><Label>Insurance Policy</Label><Input value={editForm.insurancePolicy} onChange={(e) => setEditForm({ ...editForm, insurancePolicy: e.target.value })} /></div>
              <div className="space-y-1"><Label>Insurance Expiry</Label><Input type="date" value={editForm.insuranceExpiry} onChange={(e) => setEditForm({ ...editForm, insuranceExpiry: e.target.value })} /></div>
              <div className="space-y-1"><Label>Licence Expiry</Label><Input type="date" value={editForm.licenceExpiry} onChange={(e) => setEditForm({ ...editForm, licenceExpiry: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingVehicle(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingVehicle} onClose={() => setDeletingVehicle(null)} title="Delete Vehicle">
        {deletingVehicle && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete <strong>{deletingVehicle.plateNumber}</strong> ({deletingVehicle.make} {deletingVehicle.model})?
              This action cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingVehicle(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Delete
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>
    </div>
  );
}

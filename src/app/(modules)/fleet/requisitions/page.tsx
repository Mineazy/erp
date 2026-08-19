'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { Dialog } from '@/components/ui/dialog';
import { useReportExport } from '@/hooks/use-report-export';

import { ClipboardList, Plus, Check, X, QrCode, Printer, Download, Eye, Fuel, CheckCircle, Clock, Search, Filter, MoreVertical, Building, MapPin, CheckSquare, Settings2, Trash2 } from 'lucide-react';
import { useNetwork } from '@/lib/hooks/use-network';
import { cacheData, getCachedData, saveOfflineTransaction } from '@/lib/db';
import jsPDF from 'jspdf';

interface Vehicle {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
}

interface Requisition {
  id: string;
  vehicleId: string;
  vehicle: Vehicle;
  userId: string;
  userName: string;
  fuelType: string;
  litersRequested: number;
  status: string;
  purpose: string;
  approvedBy: string | null;
  treasurerApprovedBy: string | null;
  financeManagerApprovedBy: string | null;
  qrCodeUrl: string | null;
  redeemToken: string | null;
  gasStation: string | null;
  driverName?: string | null;
  branch?: string | null;
  destination?: string | null;
  currentOdometer?: number | string | null;
  createdAt: string;
}

function Barcode({ value }: { value: string }) {
  const charPatterns: Record<string, string> = {
    '0': '10100110101', '1': '110100101011', '2': '101100101011',
    '3': '110110010101', '4': '101001101011', '5': '110100110101',
    '6': '101100110101', '7': '101001101101', '8': '110100110110',
    '9': '101100110110'
  };
  const startStop = '10010110';
  let binaryString = startStop;
  for (const char of value) {
    binaryString += (charPatterns[char] || '10101') + '0';
  }
  binaryString += startStop;

  return (
    <svg width="240" height="60" className="mx-auto">
      <g fill="#000">
        {binaryString.split('').map((bit, index) => {
          if (bit === '1') {
            return (
              <rect
                key={index}
                x={index * 2.5}
                y="0"
                width={2}
                height="60"
              />
            );
          }
          return null;
        })}
      </g>
    </svg>
  );
}

function getBarcodeSvg(value: string) {
  const charPatterns: Record<string, string> = {
    '0': '10100110101', '1': '110100101011', '2': '101100101011',
    '3': '110110010101', '4': '101001101011', '5': '110100110101',
    '6': '101100110101', '7': '101001101101', '8': '110100110110',
    '9': '101100110110'
  };
  const startStop = '10010110';
  let binaryString = startStop;
  for (const char of value) {
    binaryString += (charPatterns[char] || '10101') + '0';
  }
  binaryString += startStop;

  let rects = '';
  binaryString.split('').forEach((bit, index) => {
    if (bit === '1') {
      rects += `<rect x="${index * 2.5}" y="0" width="2" height="60" fill="#000" />`;
    }
  });

  return `<svg width="240" height="60" style="margin: 0 auto; display: block;">${rects}</svg>`;
}

const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const drawTokenBarcode = (doc: jsPDF, value: string, x: number, y: number, unit: number, height: number) => {
  const charPatterns: Record<string, string> = {
    '0': '10100110101', '1': '110100101011', '2': '101100101011',
    '3': '110110010101', '4': '101001101011', '5': '110100110101',
    '6': '101100110101', '7': '101001101101', '8': '110100110110',
    '9': '101100110110'
  };
  const startStop = '10010110';
  let binaryString = startStop;
  for (const char of value) {
    binaryString += (charPatterns[char] || '10101') + '0';
  }
  binaryString += startStop;

  let cx = x;
  for (const bit of binaryString) {
    if (bit === '1') doc.rect(cx, y, unit, height, 'F');
    cx += unit;
  }
};

export default function FleetRequisitionsPage() {
  const { isOnline } = useNetwork();
  const { triggerExport, ExportDialog } = useReportExport();
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVoucher, setActiveVoucher] = useState<Requisition | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id?: string; email?: string; role?: string; name?: string } | null>(null);

  // Form states
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [fuelType, setFuelType] = useState('Diesel');
  const [gasStation, setGasStation] = useState('Zuva Petroleum Harare');
  const [requestedLiters, setRequestedLiters] = useState('');
  const [reqPurpose, setReqPurpose] = useState('');
  const [currentOdometer, setCurrentOdometer] = useState('');
  const [driverName, setDriverName] = useState('');
  const [branch, setBranch] = useState('');
  const [destination, setDestination] = useState('');

  const fetchData = async () => {
    try {
      if (!isOnline) {
        const cachedVehicles = await getCachedData('fleet_vehicles_cache');
        if (cachedVehicles.length > 0) setVehicles(cachedVehicles);
        setLoading(false);
        return;
      }

      const [reqsRes, vehiclesRes] = await Promise.all([
        fetch('/api/fleet/requisitions'),
        fetch('/api/fleet/vehicles')
      ]);
      if (reqsRes.ok && vehiclesRes.ok) {
        const reqsData = await reqsRes.json();
        const vehiclesData = await vehiclesRes.json();
        setRequisitions(reqsData);
        setVehicles(vehiclesData);
        
        if (isOnline) {
          await cacheData('fleet_vehicles_cache', vehiclesData);
        }
      }
    } catch (_) {
      toast('Failed to load requisitions data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((s) => setCurrentUser(s?.user || null))
      .catch(() => setCurrentUser(null));
  }, []);

  const handleCreateRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle || !requestedLiters || !reqPurpose || !fuelType || !currentOdometer || !driverName || !branch || !destination) {
      toast('Please complete all form fields', 'warning');
      return;
    }
    
    const payload = {
      action: 'create',
      vehicleId: selectedVehicle,
      fuelType,
      gasStation,
      litersRequested: Number(requestedLiters),
      purpose: reqPurpose,
      currentOdometer: Number(currentOdometer),
      driverName,
      branch,
      destination
    };

    if (!isOnline) {
      try {
        await saveOfflineTransaction({
          id: crypto.randomUUID(),
          type: 'fleet_requisition',
          payload,
          timestamp: Date.now()
        });
        toast('Offline fuel requisition saved locally', 'success');
        
        const veh = vehicles.find(v => v.id === selectedVehicle);
        const simReq: Requisition = {
          id: `off-${Date.now()}`,
          vehicleId: selectedVehicle,
          vehicle: veh || { id: '', plateNumber: 'Offline', make: '', model: '' },
          userId: 'offline-user',
          userName: 'Offline User',
          fuelType,
          gasStation,
          litersRequested: Number(requestedLiters),
          purpose: reqPurpose,
          status: 'PENDING',
          approvedBy: null,
          treasurerApprovedBy: null,
          financeManagerApprovedBy: null,
          qrCodeUrl: null,
          redeemToken: null,
          createdAt: new Date().toISOString()
        };
        setRequisitions(prev => [simReq, ...prev]);
        
        setSelectedVehicle('');
        setRequestedLiters('');
        setReqPurpose('');
        setCurrentOdometer('');
        setDriverName('');
        setBranch('');
        setDestination('');
      } catch {
        toast('Failed to save offline requisition', 'error');
      }
      return;
    }

    try {
      const res = await fetch('/api/fleet/requisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast('Fuel requisition submitted successfully', 'success');
        setSelectedVehicle('');
        setRequestedLiters('');
        setReqPurpose('');
        setCurrentOdometer('');
        setDriverName('');
        setBranch('');
        setDestination('');
        fetchData();
      } else {
        toast('Failed to submit requisition', 'error');
      }
    } catch (_) {
      toast('Connection error', 'error');
    }
  };

  const handleProcessRequisition = async (id: string, actionType: 'approve_treasurer' | 'approve_finance' | 'reject') => {
    try {
      const res = await fetch('/api/fleet/requisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          requisitionId: id
        })
      });
      if (res.ok) {
        toast(
          actionType === 'approve_treasurer'
            ? 'First approval recorded (Treasurer)'
            : actionType === 'approve_finance'
            ? 'Final approval completed. Voucher issued!'
            : 'Requisition rejected',
          'success'
        );
        fetchData();
      } else {
        const err = await res.json().catch(() => ({ error: 'Error processing request' }));
        toast(err.error || 'Failed to process request', 'error');
      }
    } catch (_) {
      toast('Connection error', 'error');
    }
  };

  const canDownload = (req: Requisition) => {
    if (!currentUser) return false;
    const isRequestor = req.userId === currentUser.id || req.userId === currentUser.email;
    const isTreasurer = currentUser.role === 'treasurer';
    return isRequestor || isTreasurer;
  };

  const handleDownloadPDF = async (req: Requisition) => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');

      // Logo + header
      const logoBase64 = await fetchImageAsBase64('/logo.png');
      if (logoBase64) doc.addImage(logoBase64, 'PNG', 14, 15, 26, 10);
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      doc.text('Mineazy Logistics', 14, 32);
      doc.setFontSize(12);
      doc.setTextColor(79, 70, 229);
      doc.text('CORPORATE FUEL VOUCHER', 196, 32, { align: 'right' });
      doc.line(14, 40, 196, 40);

      // Voucher details
      const rows: [string, string][] = [
        ['Voucher Reference', `REF-${req.id.slice(0, 8).toUpperCase()}`],
        ['Vehicle Plate', req.vehicle.plateNumber],
        ['Driver Name', req.driverName || '-'],
        ['Branch', req.branch || '-'],
        ['Destination', req.destination || '-'],
        ['Fuel Type', req.fuelType],
        ['Volume to Redeem', `${req.litersRequested} Liters`],
        ['Odometer Reading', req.currentOdometer ? `${req.currentOdometer} km` : '-'],
        ['Redeem Gas Station', req.gasStation || '-'],
        ['Treasurer Approval', req.treasurerApprovedBy || 'Verified'],
        ['Finance Manager', req.financeManagerApprovedBy || 'Verified'],
      ];

      let y = 52;
      doc.setFontSize(12);
      for (const [label, value] of rows) {
        doc.setTextColor(100, 116, 139);
        doc.text(label, 14, y);
        doc.setTextColor(15, 23, 42);
        doc.text(value, 95, y);
        y += 8.5;
      }

      // Token box with barcode
      y += 4;
      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(14, y, 182, 32, 3, 3, 'FD');
      doc.setFillColor(15, 23, 42);
      drawTokenBarcode(doc, req.redeemToken || '000000', 30, y + 7, 0.45, 14);
      doc.setFontSize(13);
      doc.setTextColor(79, 70, 229);
      doc.text(`REDEEM CODE: ${req.redeemToken}`, 105, y + 26, { align: 'center' });

      // QR code
      if (req.qrCodeUrl) {
        const qrBase64 = await fetchImageAsBase64(req.qrCodeUrl);
        if (qrBase64) doc.addImage(qrBase64, 'PNG', 177, y + 4, 16, 16);
      }

      // Footer
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'Approved corporate haulage fuel voucher. Present this printout to the station operator to authorize fuel dispensing.',
        105,
        282,
        { align: 'center' }
      );
      doc.text('*** End of Voucher ***', 105, 289, { align: 'center' });

      const url = window.URL.createObjectURL(doc.output('blob'));
      triggerExport(url, `Fuel_Voucher_REF-${req.id.slice(0, 8).toUpperCase()}`);
    } catch (e) {
      console.error('Failed to generate voucher PDF:', e);
      toast('Failed to generate voucher PDF', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return <Badge variant="warning">Awaiting Treasurer (First)</Badge>;
      case 'TREASURER_APPROVED':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">Awaiting Finance Manager (Final)</Badge>;
      case 'APPROVED':
        return <Badge variant="success">Approved & Issued</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-mine-blue-800" />
          Fuel Requisitions
        </h2>
        <p className="text-slate-500 mt-1">Manage and audit vehicle fueling approval requests, QR code verifications, and gas station tokens</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Requisitions List */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-lg">Requisition Registry & Approvals</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requested Date</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Fuel Type</TableHead>
                    <TableHead>Volume</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requisitions.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-slate-500 font-mono text-xs">
                        {new Date(r.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-bold text-slate-800">
                        <div className="flex flex-col">
                          <span>{r.vehicle.plateNumber}</span>
                          <span className="text-[10px] text-slate-500 font-normal">{r.gasStation}</span>
                        </div>
                      </TableCell>
                      <TableCell>{r.userName}</TableCell>
                      <TableCell>
                        <Badge variant={r.fuelType === 'Diesel' ? 'secondary' : 'default'} className="text-[10px]">
                          {r.fuelType}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{r.litersRequested} L</TableCell>
                      <TableCell>{getStatusBadge(r.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {r.status === 'PENDING' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleProcessRequisition(r.id, 'approve_treasurer')}
                                className="text-xs h-8 gap-1 border-blue-200 text-blue-600 hover:bg-blue-50"
                                title="Approve as Treasurer (1st Level)"
                              >
                                <Check className="h-3.5 w-3.5" />
                                Treasurer
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleProcessRequisition(r.id, 'reject')}
                                className="text-xs h-8 p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                          {r.status === 'TREASURER_APPROVED' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleProcessRequisition(r.id, 'approve_finance')}
                                className="text-xs h-8 gap-1 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                title="Approve as Finance Manager (Final Level)"
                              >
                                <Check className="h-3.5 w-3.5" />
                                Finance Mgr
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleProcessRequisition(r.id, 'reject')}
                                className="text-xs h-8 p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                          {r.status === 'APPROVED' && (
                            <>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setActiveVoucher(r)}
                                className="text-xs h-8 gap-1"
                              >
                                <Eye className="h-3 w-3" />
                                View Voucher
                              </Button>
                              {canDownload(r) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDownloadPDF(r)}
                                  className="text-xs h-8 p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                  title="Download Fuel Slip PDF"
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          )}

                          {r.status === 'REJECTED' && (
                            <span className="text-xs text-slate-400 font-medium italic">Rejected</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {requisitions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-400">No requisitions submitted yet</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Submit Requisition Form */}
        <Card className="self-start">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-lg">Request Fuel</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <form onSubmit={handleCreateRequisition} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Select Vehicle</label>
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                >
                  <option value="">-- Choose Vehicle --</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plateNumber} ({v.make} {v.model})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Driver Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Moyo"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Branch *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Harare Branch"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Current Odometer Reading (km) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 125000"
                    value={currentOdometer}
                    onChange={(e) => setCurrentOdometer(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Requested Liters (L)</label>
                  <input
                    type="number"
                    placeholder="e.g. 50"
                    value={requestedLiters}
                    onChange={(e) => setRequestedLiters(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Fuel Type</label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                  >
                    <option value="Diesel">Diesel</option>
                    <option value="Petrol">Petrol</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Redeem Gas Station</label>
                  <select
                    value={gasStation}
                    onChange={(e) => setGasStation(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                  >
                    <option value="Zuva Petroleum Harare">Zuva Petroleum</option>
                    <option value="Puma Energy Belgravia">Puma Energy</option>
                    <option value="TotalEnergies Avondale">TotalEnergies</option>
                    <option value="Engen Msasa">Engen Petroleum</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Destination *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Branch Harare"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Purpose / Notes</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Hauling ore from WH-EAST to Branch Harare"
                  value={reqPurpose}
                  onChange={(e) => setReqPurpose(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                />
              </div>
              <Button type="submit" className="w-full font-bold">Submit Request</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Voucher Code Preview Modal Dialog */}
      <Dialog
        open={!!activeVoucher}
        onClose={() => setActiveVoucher(null)}
        title="Verifiable Fuel Voucher"
        description="Verify and download official fuel slip"
      >
        {activeVoucher && (
          <div className="space-y-4 py-4 flex flex-col items-center">
            {/* Voucher Specs */}
            <div className="w-full bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm space-y-2">
              <div className="flex items-center gap-3 border-b border-slate-200 pb-3 mb-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Mineazy Logo" className="h-10 object-contain" />
                <div>
                  <p className="font-bold text-indigo-700">Fuel Voucher</p>
                  <p className="text-[11px] text-slate-500">REF-{activeVoucher.id.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Plate Number:</span>
                <span className="font-bold text-slate-800">{activeVoucher.vehicle.plateNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fuel Type / Volume:</span>
                <span className="font-bold text-slate-800">{activeVoucher.fuelType} - {activeVoucher.litersRequested} L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Redeem Station:</span>
                <span className="font-bold text-indigo-700">{activeVoucher.gasStation}</span>
              </div>
              <div className="flex justify-between text-xs pt-1.5 border-t border-slate-200">
                <span className="text-slate-500">1st (Treasurer):</span>
                <span className="font-medium text-emerald-600">Approved ({activeVoucher.treasurerApprovedBy})</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Final (Finance Mgr):</span>
                <span className="font-medium text-emerald-600">Approved ({activeVoucher.financeManagerApprovedBy})</span>
              </div>
            </div>

            {/* Barcoded Token Representation */}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-3 text-center w-full">
              <div className="mb-2">
                <Barcode value={activeVoucher.redeemToken || '000000'} />
              </div>
              <div className="text-indigo-700 font-bold text-base">
                TOKEN: {activeVoucher.redeemToken}
              </div>
            </div>

            {/* QR Code representation */}
            {activeVoucher.qrCodeUrl && (
              <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={activeVoucher.qrCodeUrl} alt="Voucher QR Code" className="w-[130px] h-[130px]" />
              </div>
            )}

            {/* PDF Slip Download trigger */}
            {canDownload(activeVoucher) && (
              <Button
                onClick={() => handleDownloadPDF(activeVoucher)}
                className="w-full font-bold gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Download className="h-4 w-4" />
                Download Slip (PDF)
              </Button>
            )}
          </div>
        )}
      </Dialog>
      {ExportDialog}
    </div>
  );
}

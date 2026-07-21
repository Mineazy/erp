'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { Dialog } from '@/components/ui/dialog';

import { ClipboardList, Plus, Check, X, QrCode, Printer, Download, Eye, Fuel, CheckCircle, Clock, Search, Filter, MoreVertical, Building, MapPin, CheckSquare, Settings2, Trash2 } from 'lucide-react';
import { useNetwork } from '@/lib/hooks/use-network';
import { cacheData, getCachedData, saveOfflineTransaction } from '@/lib/db';

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

export default function FuelRequisitionsPage() {
  const { isOnline } = useNetwork();
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVoucher, setActiveVoucher] = useState<Requisition | null>(null);

  // Form states
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [fuelType, setFuelType] = useState('Diesel');
  const [gasStation, setGasStation] = useState('Zuva Petroleum Harare');
  const [requestedLiters, setRequestedLiters] = useState('');
  const [reqPurpose, setReqPurpose] = useState('');

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

  const handleCreateRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle || !requestedLiters || !reqPurpose || !fuelType) {
      toast('Please complete all form fields', 'warning');
      return;
    }
    
    const payload = {
      action: 'create',
      vehicleId: selectedVehicle,
      fuelType,
      gasStation,
      litersRequested: Number(requestedLiters),
      purpose: reqPurpose
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

  const handleDownloadPDF = (req: Requisition) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Fuel Voucher - ${req.id.slice(0, 8)}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; background-color: #f8fafc; }
            .voucher { border: 2px dashed #4f46e5; border-radius: 16px; padding: 30px; max-width: 500px; margin: 0 auto; background: #ffffff; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 20px; }
            .logo { font-size: 24px; font-weight: 800; color: #4f46e5; letter-spacing: 1px; }
            .title { font-size: 13px; text-transform: uppercase; color: #64748b; margin-top: 5px; font-weight: 700; letter-spacing: 0.5px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 14px; font-size: 14px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
            .label { color: #64748b; font-weight: 500; }
            .value { color: #0f172a; font-weight: 700; }
            .token-box { background: #f1f5f9; border: 2px solid #cbd5e1; border-radius: 12px; padding: 18px; text-align: center; margin: 25px 0; }
            .barcode { font-size: 32px; letter-spacing: 4px; font-weight: 400; color: #000000; margin-bottom: 8px; font-family: 'Libre Barcode 39', 'Courier New', monospace; line-height: 1; }
            .token { font-size: 18px; font-weight: 800; color: #4f46e5; font-family: monospace; letter-spacing: 1px; }
            .qr-container { display: flex; justify-content: center; margin: 20px 0; }
            .qr-code { width: 140px; height: 140px; border: 1px solid #e2e8f0; padding: 6px; bg: #fff; border-radius: 8px; }
            .footer { text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 25px; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="voucher">
            <div class="header">
              <div class="logo">MINEAZY LOGISTICS</div>
              <div class="title">Corporate Fuel Voucher</div>
            </div>
            <div class="row">
              <span class="label">Voucher Reference:</span>
              <span class="value">REF-${req.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <div class="row">
              <span class="label">Vehicle Plate:</span>
              <span class="value">${req.vehicle.plateNumber}</span>
            </div>
            <div class="row">
              <span class="label">Fuel Type:</span>
              <span class="value">${req.fuelType}</span>
            </div>
            <div class="row">
              <span class="label">Volume to Redeem:</span>
              <span class="value">${req.litersRequested} Liters</span>
            </div>
            <div class="row">
              <span class="label">Gas Station:</span>
              <span class="value">${req.gasStation}</span>
            </div>
            <div class="row">
              <span class="label">Treasurer Approval:</span>
              <span class="value">${req.treasurerApprovedBy || 'Verified'}</span>
            </div>
            <div class="row">
              <span class="label">Finance Manager:</span>
              <span class="value">${req.financeManagerApprovedBy || 'Verified'}</span>
            </div>
            
            <div class="token-box">
              <div style="margin-bottom: 8px;">${getBarcodeSvg(req.redeemToken || '000000')}</div>
              <div class="token">REDEEM CODE: ${req.redeemToken}</div>
            </div>

            <div class="qr-container">
              <img class="qr-code" src="${req.qrCodeUrl || 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=FuelSlip'}" />
            </div>

            <div class="footer">
              Approved corporate haulage fuel voucher. Bring this printout or mobile PDF token to the station operator to authorize fuel dispensing.
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast('PDF Slip sent to browser print printer queues', 'success');
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
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownloadPDF(r)}
                                className="text-xs h-8 p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                title="Download Fuel Slip PDF"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
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
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Requested Liters (L)</label>
                <input
                  type="number"
                  placeholder="e.g. 50"
                  value={requestedLiters}
                  onChange={(e) => setRequestedLiters(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Purpose / Destination Details</label>
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
            <Button
              onClick={() => handleDownloadPDF(activeVoucher)}
              className="w-full font-bold gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Download className="h-4 w-4" />
              Download Slip (PDF)
            </Button>
          </div>
        )}
      </Dialog>
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Fuel, ScanLine, CheckCircle2, AlertTriangle, Loader2, Droplets, User, FileText, Download, Calendar, Printer } from 'lucide-react';
import { toast } from '@/components/ui/toast';
import jsPDF from 'jspdf';

interface VoucherData {
  id: string;
  plateNumber: string;
  vehicleDetails: string;
  fuelType: string;
  liters: number;
  gasStation: string;
  treasurerApprovedBy: string | null;
  financeManagerApprovedBy: string | null;
  token: string | null;
  createdAt: string;
}

interface RedemptionResult {
  success: boolean;
  message: string;
  requisition: any;
  deduction: {
    fuelType: string;
    litersDeducted: number;
    remainingBalance: number;
  };
}

interface DispatchRecord {
  id: string;
  token: string;
  plateNumber: string;
  vehicleDetails: string;
  fuelType: string;
  liters: number;
  drawdownVoucherNo: string;
  gasStation: string;
  redeemedBy: string;
  redeemedAt: string;
}

interface PrepaidBalance {
  fuelType: string;
  balanceLiters: number;
  pricePerLiter: number;
}

interface ZReportData {
  date: string;
  attendant: string;
  dispatches: DispatchRecord[];
  summary: Record<string, { liters: number; count: number }>;
  prepaidBalances: PrepaidBalance[];
  totalDispatches: number;
}

export default function FuelAttendantPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user as any;

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || user?.role !== 'fuel_attendant') {
      router.push('/dashboard');
    }
  }, [session, status, user, router]);

  // Step 1: Scan token
  const [scannedToken, setScannedToken] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [voucher, setVoucher] = useState<VoucherData | null>(null);
  const [verifyError, setVerifyError] = useState('');
  const tokenInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Dispatch details
  const [plateNumber, setPlateNumber] = useState('');
  const [drawdownVoucherNo, setDrawdownVoucherNo] = useState('');
  const [attendantName, setAttendantName] = useState(user?.name || '');
  const [dispatching, setDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState('');

  // Step 3: Result
  const [result, setResult] = useState<RedemptionResult | null>(null);

  // Z-Report
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<ZReportData | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    tokenInputRef.current?.focus();
  }, []);

  const handleVerifyToken = async () => {
    if (!scannedToken.trim()) return;
    setVerifying(true);
    setVerifyError('');
    setVoucher(null);
    setResult(null);

    try {
      const res = await fetch(`/api/verify/fuel?token=${encodeURIComponent(scannedToken.trim())}`);
      const data = await res.json();
      if (res.ok && data.verified) {
        setVoucher(data.voucher);
        setPlateNumber(data.voucher.plateNumber || '');
      } else {
        setVerifyError(data.error || 'Voucher is invalid or has not been approved yet');
      }
    } catch {
      setVerifyError('Network error — could not verify voucher');
    } finally {
      setVerifying(false);
    }
  };

  const handleTokenKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleVerifyToken();
    }
  };

  const handleDispatch = async () => {
    if (!plateNumber.trim() || !drawdownVoucherNo.trim() || !attendantName.trim()) return;
    setDispatching(true);
    setDispatchError('');

    try {
      const res = await fetch('/api/fleet/requisitions/redemption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: scannedToken.trim(),
          plateNumber: plateNumber.trim(),
          drawdownVoucherNo: drawdownVoucherNo.trim(),
          attendantName: attendantName.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResult(data);
      } else {
        setDispatchError(data.error || 'Failed to dispense fuel');
      }
    } catch {
      setDispatchError('Network error — could not dispatch fuel');
    } finally {
      setDispatching(false);
    }
  };

  const handleReset = () => {
    setScannedToken('');
    setVoucher(null);
    setVerifyError('');
    setPlateNumber('');
    setDrawdownVoucherNo('');
    setResult(null);
    setDispatchError('');
    tokenInputRef.current?.focus();
  };

  // Z-Report fetch
  const fetchReport = async () => {
    setLoadingReport(true);
    try {
      const params = new URLSearchParams({ date: reportDate });
      if (user?.name) params.set('attendant', user.name);
      const res = await fetch(`/api/fleet/requisitions/dispatches?${params.toString()}`);
      const data = await res.json();
      setReportData(data);
    } catch {
      toast('Failed to load Z-Report', 'error');
    } finally {
      setLoadingReport(false);
    }
  };

  // CSV Export
  const exportCSV = () => {
    if (!reportData || !reportData.dispatches.length) {
      toast('No dispatches to export', 'warning');
      return;
    }
    const headers = ['#', 'Time', 'Token', 'Plate Number', 'Vehicle', 'Fuel Type', 'Litres', 'Drawdown Voucher', 'Gas Station', 'Attendant'];
    const rows = reportData.dispatches.map((d, i) => [
      i + 1,
      new Date(d.redeemedAt).toLocaleTimeString(),
      d.token,
      d.plateNumber,
      d.vehicleDetails,
      d.fuelType,
      d.liters,
      d.drawdownVoucherNo,
      d.gasStation,
      d.redeemedBy,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Z-Report-Fuel-${reportData.date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('CSV exported successfully', 'success');
  };

  // PDF Export
  const exportPDF = async () => {
    if (!reportData) {
      toast('No report data to export', 'warning');
      return;
    }
    const doc = new jsPDF('p', 'mm', 'a4');

    // Load logo
    let logoBase64: string | null = null;
    try {
      const response = await fetch('/logo.png');
      if (response.ok) {
        const blob = await response.blob();
        logoBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } catch {}

    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', 14, 10, 40, 15);
    }

    doc.setFontSize(20);
    doc.text('Fuel Attendant Day End Z-Report', 14, 35);

    doc.setFontSize(11);
    doc.text(`Date: ${reportData.date}`, 14, 44);
    doc.text(`Attendant: ${reportData.attendant}`, 14, 51);
    doc.text(`Total Dispatches: ${reportData.totalDispatches}`, 14, 58);

    doc.setLineWidth(0.5);
    doc.line(14, 63, 196, 63);

    // Dispatches table
    doc.setFontSize(13);
    doc.text('Dispatch Details', 14, 71);

    const tableHeaders = ['#', 'Time', 'Token', 'Plate', 'Fuel', 'Litres', 'Drawdown Voucher'];
    const tableRows = reportData.dispatches.map((d, i) => [
      String(i + 1),
      new Date(d.redeemedAt).toLocaleTimeString(),
      d.token || '',
      d.plateNumber,
      d.fuelType,
      String(d.liters),
      d.drawdownVoucherNo,
    ]);

    let y = 78;
    doc.setFontSize(8);
    const colX = [14, 22, 42, 60, 78, 94, 108];
    const colW = [8, 20, 18, 18, 16, 14, 82];

    // Table header
    doc.setFont('helvetica', 'bold');
    tableHeaders.forEach((h, ci) => {
      doc.text(h, colX[ci], y);
    });
    y += 5;
    doc.setFont('helvetica', 'normal');

    // Table rows
    for (const row of tableRows) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      row.forEach((cell, ci) => {
        doc.text(cell.substring(0, 30), colX[ci], y);
      });
      y += 5;
    }

    // Summary
    y += 5;
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setLineWidth(0.5);
    doc.line(14, y, 196, y);
    y += 8;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary by Fuel Type', 14, y);
    y += 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    for (const [fuelType, data] of Object.entries(reportData.summary)) {
      doc.text(`${fuelType}: ${data.count} dispatches — ${data.liters.toFixed(2)} litres`, 14, y);
      y += 7;
    }

    // Prepaid balances
    y += 5;
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Prepaid Fuel Balances (After Dispatches)', 14, y);
    y += 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    for (const p of reportData.prepaidBalances) {
      doc.text(`${p.fuelType}: ${p.balanceLiters.toFixed(2)} litres remaining @ $${p.pricePerLiter.toFixed(2)}/L`, 14, y);
      y += 7;
    }

    // Footer
    y += 10;
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    doc.text(`Generated: ${new Date().toLocaleString()} | Mineazy ERP — Fuel Attendant Z-Report`, 14, y);

    doc.save(`Z-Report-Fuel-${reportData.date}.pdf`);
    toast('PDF downloaded successfully', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <img src="/logo.png" alt="Mineazy" className="h-32 w-32 object-contain mb-2" />
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Fuel className="h-6 w-6 text-cyan-600" />
          Fuel Voucher Redemption
        </h2>
        <p className="text-slate-500 mt-1">Scan a fuel voucher barcode to verify and dispatch fuel</p>
      </div>

      {/* Step 1: Scan Voucher */}
      {!result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ScanLine className="h-5 w-5 text-cyan-600" />
              Step 1: Scan Voucher Barcode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  ref={tokenInputRef}
                  type="text"
                  placeholder="Scan or enter 6-digit voucher token..."
                  value={scannedToken}
                  onChange={(e) => setScannedToken(e.target.value)}
                  onKeyDown={handleTokenKeyDown}
                  className="text-lg font-mono tracking-widest text-center"
                  maxLength={6}
                  disabled={verifying || !!voucher}
                />
              </div>
              <Button
                onClick={handleVerifyToken}
                disabled={!scannedToken.trim() || verifying || !!voucher}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
              </Button>
            </div>
            {verifyError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {verifyError}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Voucher Verified — Show Details + Dispatch Form */}
      {voucher && !result && (
        <>
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-emerald-800">
                <CheckCircle2 className="h-5 w-5" />
                Voucher Verified — {voucher.fuelType}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-slate-500 block">Vehicle</span>
                  <span className="font-bold text-slate-900">{voucher.vehicleDetails}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Plate Number</span>
                  <span className="font-bold text-slate-900">{voucher.plateNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Fuel Quantity</span>
                  <span className="font-bold text-slate-900">{voucher.liters} Litres</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Gas Station</span>
                  <span className="font-bold text-indigo-700">{voucher.gasStation}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Droplets className="h-5 w-5 text-cyan-600" />
                Step 2: Dispatch Fuel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plateNumber">Vehicle Plate Number *</Label>
                  <Input
                    id="plateNumber"
                    placeholder="e.g. ABC-123"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="drawdownNo">Gas Station Drawdown Voucher No. *</Label>
                  <Input
                    id="drawdownNo"
                    placeholder="e.g. GSV-2026-0045"
                    value={drawdownVoucherNo}
                    onChange={(e) => setDrawdownVoucherNo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attendantName">Attendant Name *</Label>
                  <Input
                    id="attendantName"
                    placeholder="Your full name"
                    value={attendantName}
                    onChange={(e) => setAttendantName(e.target.value)}
                  />
                </div>
              </div>
              {dispatchError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  {dispatchError}
                </div>
              )}
              <div className="flex gap-3">
                <Button
                  onClick={handleDispatch}
                  disabled={!plateNumber.trim() || !drawdownVoucherNo.trim() || !attendantName.trim() || dispatching}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {dispatching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Droplets className="h-4 w-4 mr-2" />}
                  Dispatch Fuel
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Success Result */}
      {result && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-emerald-800">
              <CheckCircle2 className="h-6 w-6" />
              Fuel Dispatched Successfully
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-slate-500 block">Fuel Type</span>
                <span className="font-bold text-slate-900">{result.deduction.fuelType}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Litres Dispensed</span>
                <span className="font-bold text-slate-900">{result.deduction.litersDeducted} L</span>
              </div>
              <div>
                <span className="text-slate-500 block">Remaining Balance</span>
                <span className="font-bold text-slate-900">{result.deduction.remainingBalance} L</span>
              </div>
              <div>
                <span className="text-slate-500 block">Drawdown Voucher</span>
                <span className="font-bold text-slate-900">{result.requisition.drawdownVoucherNo}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-emerald-100 border border-emerald-200 rounded-lg text-emerald-800 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              Prepaid balance has been deducted. Transaction recorded.
            </div>
            <Button onClick={handleReset} className="bg-cyan-600 hover:bg-cyan-700">
              <ScanLine className="h-4 w-4 mr-2" />
              Scan Next Voucher
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Day End Z-Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-cyan-600" />
            Day End Z-Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="reportDate">Report Date</Label>
              <Input
                id="reportDate"
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="w-48"
              />
            </div>
            <Button onClick={fetchReport} disabled={loadingReport} variant="outline">
              {loadingReport ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calendar className="h-4 w-4 mr-2" />}
              Generate Report
            </Button>
            {reportData && reportData.dispatches.length > 0 && (
              <>
                <Button onClick={exportCSV} variant="outline" className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button onClick={exportPDF} variant="outline" className="bg-red-50 text-red-700 hover:bg-red-100 border-red-200">
                  <Printer className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </>
            )}
          </div>

          {reportData && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-lg p-3">
                  <span className="text-xs text-slate-500 block">Date</span>
                  <span className="font-bold text-slate-900">{reportData.date}</span>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <span className="text-xs text-slate-500 block">Attendant</span>
                  <span className="font-bold text-slate-900">{reportData.attendant}</span>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <span className="text-xs text-slate-500 block">Total Dispatches</span>
                  <span className="font-bold text-slate-900">{reportData.totalDispatches}</span>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <span className="text-xs text-slate-500 block">Fuel Types Dispensed</span>
                  <span className="font-bold text-slate-900">{Object.keys(reportData.summary).length}</span>
                </div>
              </div>

              {/* Fuel Type Totals */}
              {Object.keys(reportData.summary).length > 0 && (
                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-cyan-800 mb-2">Totals by Fuel Type</h4>
                  <div className="flex flex-wrap gap-4">
                    {Object.entries(reportData.summary).map(([ft, data]) => (
                      <div key={ft} className="text-sm">
                        <span className="text-cyan-700 font-medium">{ft}:</span>{' '}
                        <span className="font-bold text-slate-900">{data.count} dispatches</span>{' '}
                        <span className="text-slate-600">({data.liters.toFixed(2)} L)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prepaid Balances */}
              {reportData.prepaidBalances.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-amber-800 mb-2">Current Prepaid Balances</h4>
                  <div className="flex flex-wrap gap-4">
                    {reportData.prepaidBalances.map((p) => (
                      <div key={p.fuelType} className="text-sm">
                        <span className="text-amber-700 font-medium">{p.fuelType}:</span>{' '}
                        <span className="font-bold text-slate-900">{p.balanceLiters.toFixed(2)} L</span>{' '}
                        <span className="text-slate-600">@ ${p.pricePerLiter.toFixed(2)}/L</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dispatches Table */}
              {reportData.dispatches.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Token</TableHead>
                        <TableHead>Plate Number</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Fuel Type</TableHead>
                        <TableHead className="text-right">Litres</TableHead>
                        <TableHead>Drawdown Voucher</TableHead>
                        <TableHead>Gas Station</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.dispatches.map((d, i) => (
                        <TableRow key={d.id}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell>{new Date(d.redeemedAt).toLocaleTimeString()}</TableCell>
                          <TableCell className="font-mono text-xs">{d.token}</TableCell>
                          <TableCell className="font-semibold">{d.plateNumber}</TableCell>
                          <TableCell>{d.vehicleDetails}</TableCell>
                          <TableCell><Badge variant="secondary">{d.fuelType}</Badge></TableCell>
                          <TableCell className="text-right font-semibold">{d.liters.toFixed(2)}</TableCell>
                          <TableCell className="font-mono text-xs">{d.drawdownVoucherNo}</TableCell>
                          <TableCell>{d.gasStation}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No fuel dispatches recorded for {reportDate}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

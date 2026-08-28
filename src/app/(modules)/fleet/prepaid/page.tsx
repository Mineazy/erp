'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { CreditCard, ArrowUpRight, ShieldAlert, Scale, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FuelRecord {
  id: string;
  fuelType: string;
  balanceLiters: number;
  currentPricePerLiter: number;
  lastTopUpAmount: number;
  updatedAt: string;
}

interface FuelLog {
  id: string;
  fuelType: string;
  action: string;
  quantity: number;
  pricePerLiter: number;
  amount: number;
  notes: string | null;
  createdAt: string;
}

interface RequisitionLite {
  id: string;
  fuelType: string;
  litersRequested: number;
  driverName: string | null;
  status: string;
  createdAt: string;
  vehicle: { plateNumber: string } | null;
}

const PAGE_SIZE = 10;
const FUEL_TYPES = ['Diesel', 'Petrol'];
const inputCls =
  'w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800 bg-white';

const extractRequisitionRef = (notes?: string | null): string | null => {
  if (!notes) return null;
  const m = notes.match(/Requisition #([A-Za-z0-9]+)/i);
  return m ? `REF-${m[1].toUpperCase()}` : null;
};

function PaginationBar({
  page,
  totalPages,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
      <span className="text-xs text-slate-500">
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={onPrev}>
          Prev
        </Button>
        <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={onNext}>
          Next
        </Button>
      </div>
    </div>
  );
}

export default function PrepaidFuelPage() {
  const [fuels, setFuels] = useState<FuelRecord[]>([]);
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [requisitions, setRequisitions] = useState<RequisitionLite[]>([]);
  const [loading, setLoading] = useState(true);

  // Top up fields
  const [topUpType, setTopUpType] = useState('Diesel');
  const [topUpQty, setTopUpQty] = useState('');
  const [topUpPrice, setTopUpPrice] = useState('');
  const [topUpNotes, setTopUpNotes] = useState('');

  // Adjustment fields
  const [adjustType, setAdjustType] = useState('Diesel');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustPrice, setAdjustPrice] = useState('');

  // Ledger filters
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerFuelType, setLedgerFuelType] = useState('');
  const [ledgerAction, setLedgerAction] = useState('');
  const [ledgerReq, setLedgerReq] = useState('');
  const [ledgerFrom, setLedgerFrom] = useState('');
  const [ledgerTo, setLedgerTo] = useState('');
  const [ledgerPage, setLedgerPage] = useState(1);

  // Register filters
  const [regSearch, setRegSearch] = useState('');
  const [regFuelType, setRegFuelType] = useState('');
  const [regReq, setRegReq] = useState('');
  const [regDriver, setRegDriver] = useState('');
  const [regFrom, setRegFrom] = useState('');
  const [regTo, setRegTo] = useState('');
  const [regPage, setRegPage] = useState(1);

  const fetchData = async () => {
    try {
      const [prepaidRes, reqRes] = await Promise.all([
        fetch('/api/fleet/prepaid'),
        fetch('/api/fleet/requisitions'),
      ]);
      if (prepaidRes.ok) {
        const data = await prepaidRes.json();
        setFuels(data.fuels || []);
        setLogs(data.logs || []);
      }
      if (reqRes.ok) {
        setRequisitions((await reqRes.json()) || []);
      }
    } catch (_) {
      toast('Failed to load prepaid fuel accounts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── Enrichment: attach requisition ref / driver / vehicle to each log ──
  const reqByRef = useMemo(() => {
    const map = new Map<string, RequisitionLite>();
    requisitions.forEach((r) => map.set(`REF-${r.id.slice(0, 8).toUpperCase()}`, r));
    return map;
  }, [requisitions]);

  const enrichedLogs = useMemo(
    () =>
      logs.map((log) => {
        const requisitionRef = extractRequisitionRef(log.notes);
        const req = requisitionRef ? reqByRef.get(requisitionRef) : undefined;
        return {
          ...log,
          requisitionRef,
          driverName: req?.driverName || null,
          vehiclePlate: req?.vehicle?.plateNumber || null,
        };
      }),
    [logs, reqByRef]
  );

  const fuelTypes = useMemo(() => {
    const fromRecords = fuels.map((f) => f.fuelType);
    return Array.from(new Set([...FUEL_TYPES, ...fromRecords]));
  }, [fuels]);

  const inPeriod = (iso: string, from: string, to: string) => {
    const d = new Date(iso).getTime();
    if (from) {
      const f = new Date(from).getTime();
      if (d < f) return false;
    }
    if (to) {
      const t = new Date(to + 'T23:59:59').getTime();
      if (d > t) return false;
    }
    return true;
  };

  // ── Ledger (Prepaid Accounts Ledger & Audit Logs) ──
  const ledgerRows = useMemo(() => {
    const q = ledgerSearch.trim().toLowerCase();
    return enrichedLogs.filter((log) => {
      const searchable = [
        log.fuelType,
        log.action,
        log.notes || '',
        log.requisitionRef || '',
        new Date(log.createdAt).toLocaleString(),
      ]
        .join(' ')
        .toLowerCase();
      if (q && !searchable.includes(q)) return false;
      if (ledgerFuelType && log.fuelType !== ledgerFuelType) return false;
      if (ledgerAction && log.action !== ledgerAction) return false;
      if (ledgerReq.trim() && !(log.requisitionRef || '').includes(ledgerReq.trim().toUpperCase())) return false;
      if (!inPeriod(log.createdAt, ledgerFrom, ledgerTo)) return false;
      return true;
    });
  }, [enrichedLogs, ledgerSearch, ledgerFuelType, ledgerAction, ledgerReq, ledgerFrom, ledgerTo]);

  const ledgerTotalPages = Math.max(1, Math.ceil(ledgerRows.length / PAGE_SIZE));
  const safeLedgerPage = Math.min(ledgerPage, ledgerTotalPages);
  const ledgerPageRows = ledgerRows.slice((safeLedgerPage - 1) * PAGE_SIZE, safeLedgerPage * PAGE_SIZE);

  // ── Fuel Movement Register (Top-Ups & Redemptions, disaggregated by fuel type) ──
  const registerRows = useMemo(
    () => enrichedLogs.filter((log) => log.action === 'TOPUP' || log.action === 'USAGE'),
    [enrichedLogs]
  );

  const registerSummary = useMemo(() => {
    return fuelTypes.map((ft) => {
      const rows = registerRows.filter((r) => r.fuelType === ft);
      const topUps = rows.filter((r) => r.action === 'TOPUP');
      const redemptions = rows.filter((r) => r.action === 'USAGE');
      const sum = (arr: typeof rows, key: 'quantity' | 'amount') =>
        arr.reduce((acc, r) => acc + Number(r[key] || 0), 0);
      return {
        fuelType: ft,
        topUpLiters: sum(topUps, 'quantity'),
        topUpValue: sum(topUps, 'amount'),
        redemptionLiters: sum(redemptions, 'quantity'),
        redemptionValue: sum(redemptions, 'amount'),
      };
    });
  }, [fuelTypes, registerRows]);

  const driverOptions = useMemo(
    () => Array.from(new Set(registerRows.map((r) => r.driverName).filter(Boolean) as string[])),
    [registerRows]
  );

  const regFilteredRows = useMemo(() => {
    const q = regSearch.trim().toLowerCase();
    return registerRows.filter((row) => {
      const searchable = [
        row.fuelType,
        row.action,
        row.notes || '',
        row.requisitionRef || '',
        row.driverName || '',
        row.vehiclePlate || '',
        new Date(row.createdAt).toLocaleString(),
      ]
        .join(' ')
        .toLowerCase();
      if (q && !searchable.includes(q)) return false;
      if (regFuelType && row.fuelType !== regFuelType) return false;
      if (regReq.trim() && !(row.requisitionRef || '').includes(regReq.trim().toUpperCase())) return false;
      if (regDriver && row.driverName !== regDriver) return false;
      if (!inPeriod(row.createdAt, regFrom, regTo)) return false;
      return true;
    });
  }, [registerRows, regSearch, regFuelType, regReq, regDriver, regFrom, regTo]);

  const regTotalPages = Math.max(1, Math.ceil(regFilteredRows.length / PAGE_SIZE));
  const safeRegPage = Math.min(regPage, regTotalPages);
  const regPageRows = regFilteredRows.slice((safeRegPage - 1) * PAGE_SIZE, safeRegPage * PAGE_SIZE);

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topUpQty) {
      toast('Please enter a top-up quantity', 'warning');
      return;
    }
    try {
      const res = await fetch('/api/fleet/prepaid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'topup',
          fuelType: topUpType,
          quantity: Number(topUpQty),
          pricePerLiter: topUpPrice ? Number(topUpPrice) : undefined,
          notes: topUpNotes
        })
      });
      if (res.ok) {
        toast('Fuel topped up successfully', 'success');
        setTopUpQty('');
        setTopUpPrice('');
        setTopUpNotes('');
        fetchData();
      } else {
        toast('Top-up failed', 'error');
      }
    } catch (_) {
      toast('Connection error', 'error');
    }
  };

  const handleAdjustQty = async () => {
    if (!adjustQty) {
      toast('Please enter adjustment quantity', 'warning');
      return;
    }
    try {
      const res = await fetch('/api/fleet/prepaid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust_qty',
          fuelType: adjustType,
          quantity: Number(adjustQty)
        })
      });
      if (res.ok) {
        toast('Fuel balance quantity adjusted', 'success');
        setAdjustQty('');
        fetchData();
      }
    } catch (_) {}
  };

  const handleAdjustPrice = async () => {
    if (!adjustPrice) {
      toast('Please enter adjustment price', 'warning');
      return;
    }
    try {
      const res = await fetch('/api/fleet/prepaid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust_price',
          fuelType: adjustType,
          pricePerLiter: Number(adjustPrice)
        })
      });
      if (res.ok) {
        toast('Prepaid fuel unit price updated', 'success');
        setAdjustPrice('');
        fetchData();
      }
    } catch (_) {}
  };

  const activityBadge = (action: string) => {
    const variant =
      action === 'TOPUP'
        ? 'success'
        : action === 'USAGE'
        ? 'secondary'
        : action === 'ADJUST_PRICE'
        ? 'warning'
        : 'warning';
    const label =
      action === 'TOPUP' ? 'Top Up' : action === 'USAGE' ? 'Redemption' : action.replace(/_/g, ' ');
    return (
      <Badge variant={variant} className="text-[10px] uppercase font-bold">
        {label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-mine-blue-800" />
          Prepaid Fuel Accounts (Finance)
        </h2>
        <p className="text-slate-500 mt-1">Audit prepaid fuel reserves, top up balances, adjust prices, and track corporate consumption log trails</p>
      </div>

      {/* Prepaid Balances KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {fuels.map((f) => (
          <Card key={f.id} className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white shadow-md">
            <CardContent className="p-5 space-y-2">
              <p className="text-xs uppercase tracking-wider opacity-75 font-semibold">{f.fuelType} Prepaid Balance</p>
              <h3 className="text-3xl font-bold font-mono">{Number(f.balanceLiters).toLocaleString()} Liters</h3>
              <div className="flex justify-between items-center text-[11px] text-slate-300 pt-1 border-t border-white/10">
                <span>Unit Cost: ${Number(f.currentPricePerLiter).toFixed(2)}/L</span>
                <span>Valued: ${(Number(f.balanceLiters) * Number(f.currentPricePerLiter)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top-up Form & Adjustments Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-lg flex items-center gap-1.5">
                <ArrowUpRight className="h-5 w-5 text-emerald-600" />
                Prepaid Top-Up
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleTopUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Fuel Type</label>
                    <select
                      value={topUpType}
                      onChange={(e) => setTopUpType(e.target.value)}
                      className={inputCls}
                    >
                      <option value="Diesel">Diesel</option>
                      <option value="Petrol">Petrol</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Liters to Add</label>
                    <input
                      type="number"
                      placeholder="e.g. 5000"
                      value={topUpQty}
                      onChange={(e) => setTopUpQty(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Top-Up Price/L (Optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Defaults to current price"
                    value={topUpPrice}
                    onChange={(e) => setTopUpPrice(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Audit Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Purchase order PO-9988 top-up"
                    value={topUpNotes}
                    onChange={(e) => setTopUpNotes(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <Button type="submit" className="w-full font-bold">Top Up reserves</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-lg flex items-center gap-1.5">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
                Reserves Adjustments
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Target Fuel</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value)}
                  className={inputCls}
                >
                  <option value="Diesel">Diesel</option>
                  <option value="Petrol">Petrol</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <input
                    type="number"
                    placeholder="New Qty (L)"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    className={inputCls}
                  />
                  <Button onClick={handleAdjustQty} variant="secondary" size="sm" className="w-full font-bold">Adjust Qty</Button>
                </div>
                <div className="space-y-1.5">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="New Price ($)"
                    value={adjustPrice}
                    onChange={(e) => setAdjustPrice(e.target.value)}
                    className={inputCls}
                  />
                  <Button onClick={handleAdjustPrice} variant="secondary" size="sm" className="w-full font-bold">Adjust Price</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Prepaid Accounts Ledger & Audit Logs */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-lg">Prepaid Accounts Ledger & Audit Logs</CardTitle>
            </CardHeader>

            {/* Ledger filters */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-4 border-b border-slate-100">
              <div className="col-span-2 md:col-span-1 relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={ledgerSearch}
                  onChange={(e) => { setLedgerSearch(e.target.value); setLedgerPage(1); }}
                  className={`${inputCls} pl-8`}
                />
              </div>
              <select value={ledgerFuelType} onChange={(e) => { setLedgerFuelType(e.target.value); setLedgerPage(1); }} className={inputCls}>
                <option value="">All Fuel Types</option>
                {fuelTypes.map((ft) => <option key={ft} value={ft}>{ft}</option>)}
              </select>
              <select value={ledgerAction} onChange={(e) => { setLedgerAction(e.target.value); setLedgerPage(1); }} className={inputCls}>
                <option value="">All Activity</option>
                <option value="TOPUP">Top Up</option>
                <option value="USAGE">Redemption</option>
                <option value="ADJUST_QTY">Adjust Qty</option>
                <option value="ADJUST_PRICE">Adjust Price</option>
              </select>
              <input
                type="text"
                placeholder="Requisition #"
                value={ledgerReq}
                onChange={(e) => { setLedgerReq(e.target.value); setLedgerPage(1); }}
                className={inputCls}
              />
              <input type="date" value={ledgerFrom} onChange={(e) => { setLedgerFrom(e.target.value); setLedgerPage(1); }} className={inputCls} />
              <input type="date" value={ledgerTo} onChange={(e) => { setLedgerTo(e.target.value); setLedgerPage(1); }} className={inputCls} />
            </div>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Fuel Type</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Requisition #</TableHead>
                    <TableHead>Volume (L)</TableHead>
                    <TableHead>Price/L</TableHead>
                    <TableHead>Value Amount</TableHead>
                    <TableHead>Ledger Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerPageRows.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-slate-500 font-mono text-xs">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-semibold">{log.fuelType}</TableCell>
                      <TableCell>{activityBadge(log.action)}</TableCell>
                      <TableCell className="font-mono text-xs">{log.requisitionRef || '—'}</TableCell>
                      <TableCell className="font-mono">{log.quantity > 0 ? `${Number(log.quantity).toLocaleString()} L` : '-'}</TableCell>
                      <TableCell className="font-mono">${Number(log.pricePerLiter).toFixed(2)}</TableCell>
                      <TableCell className="font-mono">{log.amount > 0 ? `$${Number(log.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}</TableCell>
                      <TableCell className="text-xs text-slate-500 max-w-[200px] truncate" title={log.notes || ''}>
                        {log.notes || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {ledgerPageRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-400">No prepaid actions match your filters</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <PaginationBar
                page={safeLedgerPage}
                totalPages={ledgerTotalPages}
                onPrev={() => setLedgerPage((p) => Math.max(1, p - 1))}
                onNext={() => setLedgerPage((p) => Math.min(ledgerTotalPages, p + 1))}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fuel Movement Register (Top-Ups & Redemptions) */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-lg flex items-center gap-1.5">
            <Scale className="h-5 w-5 text-mine-blue-700" />
            Fuel Movement Register — Top-Ups & Redemptions by Fuel Type
          </CardTitle>
          <p className="text-sm text-slate-500 mt-1">Prepaid top-ups and voucher redemptions disaggregated by fuel type</p>
        </CardHeader>

        {/* Per-fuel-type summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border-b border-slate-100">
          {registerSummary.map((s) => (
            <div key={s.fuelType} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{s.fuelType}</p>
                <Badge variant="secondary" className="text-[10px]">Register Totals</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-600 mb-1">Top-Ups</p>
                  <p className="text-lg font-bold font-mono text-emerald-700">{Number(s.topUpLiters).toLocaleString()} L</p>
                  <p className="text-xs font-mono text-emerald-600">${Number(s.topUpValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="rounded-lg bg-sky-50 border border-sky-100 p-3">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-sky-600 mb-1">Redemptions</p>
                  <p className="text-lg font-bold font-mono text-sky-700">{Number(s.redemptionLiters).toLocaleString()} L</p>
                  <p className="text-xs font-mono text-sky-600">${Number(s.redemptionValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          ))}
          {registerSummary.length === 0 && (
            <p className="text-sm text-slate-400 py-4 text-center">No fuel movement data available</p>
          )}
        </div>

        {/* Register filters */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-4 border-b border-slate-100">
          <div className="col-span-2 md:col-span-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={regSearch}
              onChange={(e) => { setRegSearch(e.target.value); setRegPage(1); }}
              className={`${inputCls} pl-8`}
            />
          </div>
          <select value={regFuelType} onChange={(e) => { setRegFuelType(e.target.value); setRegPage(1); }} className={inputCls}>
            <option value="">All Fuel Types</option>
            {fuelTypes.map((ft) => <option key={ft} value={ft}>{ft}</option>)}
          </select>
          <input
            type="text"
            placeholder="Requisition #"
            value={regReq}
            onChange={(e) => { setRegReq(e.target.value); setRegPage(1); }}
            className={inputCls}
          />
          <select value={regDriver} onChange={(e) => { setRegDriver(e.target.value); setRegPage(1); }} className={inputCls}>
            <option value="">All Drivers</option>
            {driverOptions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <input type="date" value={regFrom} onChange={(e) => { setRegFrom(e.target.value); setRegPage(1); }} className={inputCls} />
          <input type="date" value={regTo} onChange={(e) => { setRegTo(e.target.value); setRegPage(1); }} className={inputCls} />
        </div>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date/Time</TableHead>
                <TableHead>Fuel Type</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Requisition #</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Volume (L)</TableHead>
                <TableHead>Value Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regPageRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-slate-500 font-mono text-xs">{new Date(row.createdAt).toLocaleString()}</TableCell>
                  <TableCell className="font-semibold">{row.fuelType}</TableCell>
                  <TableCell>{activityBadge(row.action)}</TableCell>
                  <TableCell className="font-mono text-xs">{row.requisitionRef || '—'}</TableCell>
                  <TableCell>{row.driverName || '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{row.vehiclePlate || '—'}</TableCell>
                  <TableCell className="font-mono">{row.quantity > 0 ? `${Number(row.quantity).toLocaleString()} L` : '-'}</TableCell>
                  <TableCell className="font-mono">{row.amount > 0 ? `$${Number(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}</TableCell>
                </TableRow>
              ))}
              {regPageRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-400">No fuel movements match your filters</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <PaginationBar
            page={safeRegPage}
            totalPages={regTotalPages}
            onPrev={() => setRegPage((p) => Math.max(1, p - 1))}
            onNext={() => setRegPage((p) => Math.min(regTotalPages, p + 1))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
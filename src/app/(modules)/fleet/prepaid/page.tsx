'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { CreditCard, ArrowUpRight, ShieldAlert, Sparkles, Scale } from 'lucide-react';

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

export default function PrepaidFuelPage() {
  const [fuels, setFuels] = useState<FuelRecord[]>([]);
  const [logs, setLogs] = useState<FuelLog[]>([]);
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

  const fetchData = async () => {
    try {
      const res = await fetch('/api/fleet/prepaid');
      if (res.ok) {
        const data = await res.json();
        setFuels(data.fuels || []);
        setLogs(data.logs || []);
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
                      className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
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
                      className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
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
                    className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Audit Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Purchase order PO-9988 top-up"
                    value={topUpNotes}
                    onChange={(e) => setTopUpNotes(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
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
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
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
                    className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
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
                    className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                  />
                  <Button onClick={handleAdjustPrice} variant="secondary" size="sm" className="w-full font-bold">Adjust Price</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Audit Logs list */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-lg">Prepaid Accounts Ledger & Audit Logs</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Fuel Type</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Volume (L)</TableHead>
                    <TableHead>Price/L</TableHead>
                    <TableHead>Value Amount</TableHead>
                    <TableHead>Ledger Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-slate-500 font-mono text-xs">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-semibold">{log.fuelType}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.action === 'TOPUP'
                              ? 'success'
                              : log.action === 'USAGE'
                              ? 'secondary'
                              : 'warning'
                          }
                          className="text-[10px] uppercase font-bold"
                        >
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{log.quantity > 0 ? `${log.quantity} L` : '-'}</TableCell>
                      <TableCell className="font-mono">${Number(log.pricePerLiter).toFixed(2)}</TableCell>
                      <TableCell className="font-mono">{log.amount > 0 ? `$${Number(log.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}</TableCell>
                      <TableCell className="text-xs text-slate-500 max-w-[200px] truncate" title={log.notes || ''}>
                        {log.notes || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {logs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-400">No prepaid actions logged</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

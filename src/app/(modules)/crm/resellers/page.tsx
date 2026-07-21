'use client';

import { toast, dismissToast } from '@/components/ui/toast';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Handshake, Search, DollarSign, Percent, TrendingUp, RefreshCw, Star, Edit3, ShoppingBag, Mail, Phone } from 'lucide-react';

interface Reseller {
  id: string;
  code: string;
  name: string;
  type: string;
  contactPerson: string;
  email: string;
  phone: string;
  city: string;
  balance: number;
  isActive: boolean;
  totalSpent: number;
  resellerDiscount: number;
}

export default function ResellersPage() {
  const [data, setData] = useState<Reseller[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [bulkSaleDialogOpen, setBulkSaleDialogOpen] = useState(false);
  const [selectedReseller, setSelectedReseller] = useState<Reseller | null>(null);

  // Form states
  const [discountRate, setDiscountRate] = useState('15.00');
  const [saleAmount, setSaleAmount] = useState('2500.00');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/crm/customers?segment=reseller');
      if (!res.ok) throw new Error('Failed to fetch resellers');
      const resellers = await res.json();
      setData(resellers);
    } catch {
      toast('Failed to load resellers database', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredResellers = data.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.code.toLowerCase().includes(search.toLowerCase()) ||
    (r.contactPerson || '').toLowerCase().includes(search.toLowerCase())
  );

  // Metrics Calculations
  const activeCount = data.filter((r) => r.isActive).length;
  const totalBulkSales = data.reduce((sum, r) => sum + Number(r.totalSpent || 0), 0);
  const avgDiscount = data.length > 0
    ? data.reduce((sum, r) => sum + Number(r.resellerDiscount || 0), 0) / data.length
    : 0;
  const outstandingAR = data.reduce((sum, r) => sum + Number(r.balance || 0), 0);

  const handleUpdateReseller = async (resellerId: string, updatedFields: Partial<Reseller>) => {
    const tid = toast('Updating reseller profile...', 'info', 120000);
    try {
      const res = await fetch(`/api/crm/customers/${resellerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields),
      });

      if (res.ok) {
        dismissToast(tid);
        toast('Reseller updated successfully', 'success');
        fetchData();
      } else {
        const err = await res.json().catch(() => ({ error: 'Update failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to update reseller', 'error');
      }
    } catch {
      dismissToast(tid);
      toast('Network error saving changes', 'error');
    }
  };

  const openDiscountDialog = (reseller: Reseller) => {
    setSelectedReseller(reseller);
    setDiscountRate(Number(reseller.resellerDiscount || 0).toFixed(2));
    setDiscountDialogOpen(true);
  };

  const saveDiscount = () => {
    if (!selectedReseller) return;
    handleUpdateReseller(selectedReseller.id, {
      resellerDiscount: parseFloat(discountRate) || 0,
    });
    setDiscountDialogOpen(false);
  };

  const openBulkSaleDialog = (reseller: Reseller) => {
    setSelectedReseller(reseller);
    setSaleAmount('2500.00');
    setBulkSaleDialogOpen(true);
  };

  const saveBulkSale = () => {
    if (!selectedReseller) return;
    const rawValue = parseFloat(saleAmount) || 0;
    const discountAmount = rawValue * (Number(selectedReseller.resellerDiscount || 0) / 100);
    const finalAmount = Math.max(0, rawValue - discountAmount);

    const newTotalSpent = Number(selectedReseller.totalSpent || 0) + finalAmount;

    handleUpdateReseller(selectedReseller.id, {
      totalSpent: newTotalSpent,
    });
    setBulkSaleDialogOpen(false);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Handshake className="h-7 w-7 text-indigo-600 animate-pulse" />
            CRM Resellers Directory
          </h2>
          <p className="text-slate-500 mt-1">Track wholesale accounts, manage contract pricing levels, and bulk discount structures</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh Database
        </Button>
      </div>

      {/* Reseller KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-900 to-indigo-950 text-white overflow-hidden relative">
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10">
            <Handshake className="h-40 w-40" />
          </div>
          <CardContent className="p-6 space-y-2">
            <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider">Active Resellers</p>
            <p className="text-3xl font-extrabold">{loading ? '...' : activeCount}</p>
            <div className="flex items-center gap-2 pt-1 text-xs text-indigo-200">
              <Star className="h-4 w-4" />
              <span>Registered Distribution Channels</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-800 to-emerald-950 text-white overflow-hidden relative">
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10">
            <DollarSign className="h-40 w-40" />
          </div>
          <CardContent className="p-6 space-y-2">
            <p className="text-emerald-200 text-xs font-semibold uppercase tracking-wider">Total Bulk Revenue</p>
            <p className="text-3xl font-extrabold">${loading ? '...' : totalBulkSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <div className="flex items-center gap-2 pt-1 text-xs text-emerald-200">
              <TrendingUp className="h-4 w-4" />
              <span>Lifetime Reseller Spent</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-700 to-amber-900 text-white overflow-hidden relative">
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10">
            <Percent className="h-40 w-40" />
          </div>
          <CardContent className="p-6 space-y-2">
            <p className="text-amber-200 text-xs font-semibold uppercase tracking-wider">Avg Discount Rate</p>
            <p className="text-3xl font-extrabold">{loading ? '...' : avgDiscount.toFixed(1)}%</p>
            <div className="flex items-center gap-2 pt-1 text-xs text-amber-200">
              <Percent className="h-4 w-4" />
              <span>Weighted Bulk Savings</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-rose-900 to-rose-950 text-white overflow-hidden relative">
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10">
            <DollarSign className="h-40 w-40" />
          </div>
          <CardContent className="p-6 space-y-2">
            <p className="text-rose-200 text-xs font-semibold uppercase tracking-wider">Reseller Outstanding A/R</p>
            <p className="text-3xl font-extrabold">${loading ? '...' : outstandingAR.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <div className="flex items-center gap-2 pt-1 text-xs text-rose-200">
              <DollarSign className="h-4 w-4" />
              <span>Wholesale Accounts Outstanding</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reseller List Table */}
      <Card className="border border-slate-100 shadow-xl bg-white/95">
        <CardHeader className="pb-3 border-b border-slate-50">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Handshake className="h-5 w-5 text-indigo-500" />
              Wholesale Partner Roster
            </CardTitle>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search reseller or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64 bg-slate-50/50"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/75">
              <TableRow>
                <TableHead className="font-semibold text-slate-600">Code</TableHead>
                <TableHead className="font-semibold text-slate-600">Partner / Contact</TableHead>
                <TableHead className="font-semibold text-slate-600">Contact Details</TableHead>
                <TableHead className="font-semibold text-slate-600 text-right">Discount Rate</TableHead>
                <TableHead className="font-semibold text-slate-600 text-right">Wholesale Spend</TableHead>
                <TableHead className="font-semibold text-slate-600 text-right">A/R Balance</TableHead>
                <TableHead className="font-semibold text-slate-600">Status</TableHead>
                <TableHead className="font-semibold text-slate-600 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-5 w-5 animate-spin text-indigo-600" />
                      <span>Loading wholesale accounts database...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredResellers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-400">No reseller profiles registered in database</TableCell>
                </TableRow>
              ) : (
                filteredResellers.map((reseller) => (
                  <TableRow key={reseller.id} className="hover:bg-slate-50/75 transition-colors">
                    <TableCell className="font-mono text-xs font-semibold text-slate-700">{reseller.code}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800">{reseller.name}</span>
                        <span className="text-xs text-slate-400">{reseller.contactPerson || reseller.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs space-y-0.5 text-slate-500">
                        {reseller.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-slate-400" />{reseller.email}</span>}
                        {reseller.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-slate-400" />{reseller.phone}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-amber-700">
                      {Number(reseller.resellerDiscount || 0).toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-slate-900">
                      ${Number(reseller.totalSpent || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-rose-700">
                      ${Number(reseller.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={reseller.isActive ? 'success' : 'secondary'}>
                        {reseller.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openDiscountDialog(reseller)}
                          className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                          title="Adjust Reseller Discount"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openBulkSaleDialog(reseller)}
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Record Bulk Order"
                        >
                          <ShoppingBag className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Adjust Discount Dialog */}
      <Dialog open={discountDialogOpen} onClose={() => setDiscountDialogOpen(false)} title="Modify Partner Discount">
        <div className="space-y-4 py-2">
          {selectedReseller && (
            <>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <span className="text-slate-400 font-medium block">Reseller Account:</span>
                <span className="text-slate-800 font-bold block">{selectedReseller.name}</span>
                <span className="text-slate-400 block font-mono mt-1">ID: {selectedReseller.code}</span>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="discount-input" className="text-xs font-semibold text-slate-700">Contract Discount Rate (%)</Label>
                <div className="relative">
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="discount-input"
                    type="number"
                    step="0.01"
                    value={discountRate}
                    onChange={(e) => setDiscountRate(e.target.value)}
                    placeholder="15.00"
                  />
                </div>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDiscountDialogOpen(false)}>Cancel</Button>
          <Button onClick={saveDiscount}>Update Rate</Button>
        </DialogFooter>
      </Dialog>

      {/* Record Bulk Purchase Dialog */}
      <Dialog open={bulkSaleDialogOpen} onClose={() => setBulkSaleDialogOpen(false)} title="Record Reseller Order">
        <div className="space-y-4 py-2">
          {selectedReseller && (
            <>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs flex justify-between items-center">
                <div>
                  <span className="text-slate-400 font-medium block">Reseller Account:</span>
                  <span className="text-slate-800 font-bold block">{selectedReseller.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">Pricing Level:</span>
                  <span className="text-amber-700 font-bold text-sm block font-mono">{Number(selectedReseller.resellerDiscount || 0).toFixed(2)}% Off</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sale-input" className="text-xs font-semibold text-slate-700">Gross Invoice Amount ($)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">$</span>
                  <Input
                    id="sale-input"
                    type="number"
                    step="0.01"
                    value={saleAmount}
                    onChange={(e) => setSaleAmount(e.target.value)}
                    placeholder="2500.00"
                    className="pl-7"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Reseller will pay: ${(parseFloat(saleAmount) || 0) * (1 - Number(selectedReseller.resellerDiscount || 0) / 100)} (Net)
                </p>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setBulkSaleDialogOpen(false)}>Cancel</Button>
          <Button onClick={saveBulkSale}>Post Bulk Order</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

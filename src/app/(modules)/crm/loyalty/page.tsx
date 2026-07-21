'use client';

import { toast, dismissToast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Award, Plus, Search, Edit3, CreditCard, ChevronRight, UserCheck, TrendingUp, Sparkles, Filter, RefreshCw, Barcode } from 'lucide-react';

interface Customer {
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
  loyaltyCardBarcode?: string | null;
  loyaltyPoints: number;
  totalSpent: number;
  cardBalance: number;
}

export default function LoyaltyProgramPage() {
  const [data, setData] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');

  const [barcodeDialogOpen, setBarcodeDialogOpen] = useState(false);
  const [pointsDialogOpen, setPointsDialogOpen] = useState(false);
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Form states
  const [newBarcode, setNewBarcode] = useState('');
  const [pointsAction, setPointsAction] = useState('add');
  const [pointsValue, setPointsValue] = useState('100');
  const [balanceAmount, setBalanceAmount] = useState('50.00');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/crm/customers');
      if (!res.ok) throw new Error('Failed to fetch customers');
      const customers = await res.json();
      setData(customers);
    } catch {
      toast('Failed to load customers database', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getTier = (points: number) => {
    if (points >= 5000) return { label: 'Platinum', variant: 'default' as const, className: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100' };
    if (points >= 1500) return { label: 'Gold', variant: 'default' as const, className: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100' };
    if (points >= 500) return { label: 'Silver', variant: 'secondary' as const, className: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100' };
    return { label: 'Bronze', variant: 'outline' as const, className: 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-100' };
  };

  const filteredCustomers = data.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      (c.loyaltyCardBarcode || '').toLowerCase().includes(search.toLowerCase());

    if (tierFilter === 'all') return matchesSearch;
    const tier = getTier(c.loyaltyPoints).label.toLowerCase();
    return matchesSearch && tier === tierFilter;
  });

  // Calculate Metrics
  const activeMembers = data.filter((c) => c.loyaltyCardBarcode).length;
  const totalPoints = data.reduce((sum, c) => sum + c.loyaltyPoints, 0);
  const totalCardBalance = data.reduce((sum, c) => sum + Number(c.cardBalance || 0), 0);
  
  const platinumCount = data.filter((c) => c.loyaltyPoints >= 5000).length;
  const goldCount = data.filter((c) => c.loyaltyPoints >= 1500 && c.loyaltyPoints < 5000).length;
  const silverCount = data.filter((c) => c.loyaltyPoints >= 500 && c.loyaltyPoints < 1500).length;
  const bronzeCount = data.filter((c) => c.loyaltyPoints < 500).length;

  const handleUpdateCustomer = async (customerId: string, updatedFields: Partial<Customer>) => {
    const tid = toast('Updating customer loyalty account...', 'info', 120000);
    try {
      const res = await fetch(`/api/crm/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields),
      });

      if (res.ok) {
        dismissToast(tid);
        toast('Customer account updated successfully', 'success');
        fetchData();
      } else {
        const err = await res.json().catch(() => ({ error: 'Update failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to update account', 'error');
      }
    } catch {
      dismissToast(tid);
      toast('Network error saving changes', 'error');
    }
  };

  const openBarcodeDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setNewBarcode(customer.loyaltyCardBarcode || '');
    setBarcodeDialogOpen(true);
  };

  const saveBarcode = () => {
    if (!selectedCustomer) return;
    handleUpdateCustomer(selectedCustomer.id, {
      loyaltyCardBarcode: newBarcode.trim() || null,
    });
    setBarcodeDialogOpen(false);
  };

  const openPointsDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setPointsAction('add');
    setPointsValue('100');
    setPointsDialogOpen(true);
  };

  const savePoints = () => {
    if (!selectedCustomer) return;
    const value = parseInt(pointsValue) || 0;
    const newPoints = pointsAction === 'add'
      ? selectedCustomer.loyaltyPoints + value
      : Math.max(0, selectedCustomer.loyaltyPoints - value);

    handleUpdateCustomer(selectedCustomer.id, {
      loyaltyPoints: newPoints,
    });
    setPointsDialogOpen(false);
  };

  const openBalanceDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setBalanceAmount('50.00');
    setBalanceDialogOpen(true);
  };

  const saveBalance = () => {
    if (!selectedCustomer) return;
    const value = parseFloat(balanceAmount) || 0;
    const newBalance = Number(selectedCustomer.cardBalance || 0) + value;

    handleUpdateCustomer(selectedCustomer.id, {
      cardBalance: newBalance,
    });
    setBalanceDialogOpen(false);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Award className="h-7 w-7 text-indigo-600 animate-pulse" />
            Customer Loyalty Program
          </h2>
          <p className="text-slate-500 mt-1">Manage reward cards, points multipliers, and preloaded wallet balances</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh Database
        </Button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-900 to-indigo-950 text-white overflow-hidden relative">
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10">
            <Award className="h-40 w-40" />
          </div>
          <CardContent className="p-6 space-y-2">
            <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider">Active Members</p>
            <p className="text-3xl font-extrabold">{loading ? '...' : activeMembers}</p>
            <div className="flex items-center gap-2 pt-1 text-xs text-indigo-200">
              <UserCheck className="h-4 w-4" />
              <span>Registered Reward Cards</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-800 to-emerald-950 text-white overflow-hidden relative">
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10">
            <Sparkles className="h-40 w-40" />
          </div>
          <CardContent className="p-6 space-y-2">
            <p className="text-emerald-200 text-xs font-semibold uppercase tracking-wider">Loyalty Points Issued</p>
            <p className="text-3xl font-extrabold">{loading ? '...' : totalPoints.toLocaleString()}</p>
            <div className="flex items-center gap-2 pt-1 text-xs text-emerald-200">
              <TrendingUp className="h-4 w-4" />
              <span>1 pt per $1,000 Purchase value</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-violet-850 to-violet-950 text-white overflow-hidden relative">
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10">
            <CreditCard className="h-40 w-40" />
          </div>
          <CardContent className="p-6 space-y-2">
            <p className="text-violet-200 text-xs font-semibold uppercase tracking-wider">Total Card Balance</p>
            <p className="text-3xl font-extrabold">${loading ? '...' : totalCardBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <div className="flex items-center gap-2 pt-1 text-xs text-violet-200">
              <CreditCard className="h-4 w-4" />
              <span>Loose Change Wallet Credits</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-100 shadow-lg bg-white overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tier Distribution</CardTitle>
            <Sparkles className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-700">
              <span className="flex items-center gap-1.5"><Badge variant="default" className="bg-purple-100 text-purple-800 hover:bg-purple-100">Platinum</Badge></span>
              <span className="font-bold">{loading ? '0' : platinumCount} members</span>
            </div>
            <div className="flex justify-between items-center text-slate-700">
              <span className="flex items-center gap-1.5"><Badge variant="default" className="bg-amber-100 text-amber-800 hover:bg-amber-100">Gold</Badge></span>
              <span className="font-bold">{loading ? '0' : goldCount} members</span>
            </div>
            <div className="flex justify-between items-center text-slate-700">
              <span className="flex items-center gap-1.5"><Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Silver</Badge></span>
              <span className="font-bold">{loading ? '0' : silverCount} members</span>
            </div>
            <div className="flex justify-between items-center text-slate-700">
              <span className="flex items-center gap-1.5"><Badge variant="default" className="bg-slate-100 text-slate-800 hover:bg-slate-100">Bronze</Badge></span>
              <span className="font-bold">{loading ? '0' : bronzeCount} members</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Customers List Card */}
      <Card className="border border-slate-100 shadow-xl bg-white/95">
        <CardHeader className="pb-3 border-b border-slate-50">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-indigo-500" />
              Member Directory
            </CardTitle>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name, code, barcode..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64 bg-slate-50/50"
                />
              </div>

              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <Filter className="h-4 w-4 text-slate-400" />
                <Select
                  options={[
                    { value: 'all', label: 'All Tiers' },
                    { value: 'platinum', label: 'Platinum' },
                    { value: 'gold', label: 'Gold' },
                    { value: 'silver', label: 'Silver' },
                    { value: 'bronze', label: 'Bronze' },
                  ]}
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="w-36 bg-slate-50/50"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/75">
              <TableRow>
                <TableHead className="font-semibold text-slate-600">Customer Code</TableHead>
                <TableHead className="font-semibold text-slate-600">Customer Name</TableHead>
                <TableHead className="font-semibold text-slate-600">Card Barcode</TableHead>
                <TableHead className="font-semibold text-slate-600">Loyalty Points</TableHead>
                <TableHead className="font-semibold text-slate-600">Tier Status</TableHead>
                <TableHead className="font-semibold text-slate-600 text-right">Card Balance</TableHead>
                <TableHead className="font-semibold text-slate-600 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-5 w-5 animate-spin text-indigo-600" />
                      <span>Loading Member Database...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-400">No member accounts matching criteria found</TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => {
                  const tier = getTier(customer.loyaltyPoints);
                  return (
                    <TableRow key={customer.id} className="hover:bg-slate-50/75 transition-colors">
                      <TableCell className="font-mono text-xs font-semibold text-slate-700">{customer.code}</TableCell>
                      <TableCell className="text-slate-800 font-medium">{customer.name}</TableCell>
                      <TableCell>
                        {customer.loyaltyCardBarcode ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-md font-mono text-xs shadow-sm">
                            <Barcode className="h-3.5 w-3.5 text-slate-500" />
                            {customer.loyaltyCardBarcode}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Not Registered</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono font-bold text-slate-800">
                        {customer.loyaltyPoints.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={tier.variant} className={tier.className}>
                          {tier.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-indigo-700">
                        ${Number(customer.cardBalance || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openBarcodeDialog(customer)}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="Register / Edit Card Barcode"
                          >
                            <Barcode className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openPointsDialog(customer)}
                            className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                            title="Adjust Loyalty Points"
                          >
                            <Award className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openBalanceDialog(customer)}
                            className="p-2 text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all"
                            title="Top-up Card Balance"
                          >
                            <CreditCard className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Barcode Edit Dialog */}
      <Dialog open={barcodeDialogOpen} onClose={() => setBarcodeDialogOpen(false)} title="Manage Loyalty Barcode">
        <div className="space-y-4 py-2">
          {selectedCustomer && (
            <>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <span className="text-slate-400 font-medium block">Member:</span>
                <span className="text-slate-800 font-bold block">{selectedCustomer.name}</span>
                <span className="text-slate-400 block font-mono mt-1">ID: {selectedCustomer.code}</span>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="barcode-input" className="text-xs font-semibold text-slate-700">Card Barcode Number</Label>
                <div className="relative">
                  <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="barcode-input"
                    value={newBarcode}
                    onChange={(e) => setNewBarcode(e.target.value)}
                    placeholder="e.g. LOYAL-12345"
                    className="pl-10"
                  />
                </div>
                <p className="text-[10px] text-slate-400">Leave blank to revoke or de-register the barcode reward card.</p>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setBarcodeDialogOpen(false)}>Cancel</Button>
          <Button onClick={saveBarcode}>Save Barcode</Button>
        </DialogFooter>
      </Dialog>

      {/* Adjust Points Dialog */}
      <Dialog open={pointsDialogOpen} onClose={() => setPointsDialogOpen(false)} title="Adjust Reward Points">
        <div className="space-y-4 py-2">
          {selectedCustomer && (
            <>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs flex justify-between items-center">
                <div>
                  <span className="text-slate-400 font-medium block">Member:</span>
                  <span className="text-slate-800 font-bold block">{selectedCustomer.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">Current Balance:</span>
                  <span className="text-indigo-600 font-bold text-sm block font-mono">{selectedCustomer.loyaltyPoints} pts</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="points-action" className="text-xs font-semibold text-slate-700">Action</Label>
                  <Select
                    id="points-action"
                    options={[
                      { value: 'add', label: 'Add (Credit)' },
                      { value: 'sub', label: 'Subtract (Debit)' },
                    ]}
                    value={pointsAction}
                    onChange={(e) => setPointsAction(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="points-value" className="text-xs font-semibold text-slate-700">Points Value</Label>
                  <Input
                    id="points-value"
                    type="number"
                    value={pointsValue}
                    onChange={(e) => setPointsValue(e.target.value)}
                    placeholder="100"
                  />
                </div>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setPointsDialogOpen(false)}>Cancel</Button>
          <Button onClick={savePoints}>Apply Adjustment</Button>
        </DialogFooter>
      </Dialog>

      {/* Top-up Balance Dialog */}
      <Dialog open={balanceDialogOpen} onClose={() => setBalanceDialogOpen(false)} title="Preload Wallet Card">
        <div className="space-y-4 py-2">
          {selectedCustomer && (
            <>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs flex justify-between items-center">
                <div>
                  <span className="text-slate-400 font-medium block">Member:</span>
                  <span className="text-slate-800 font-bold block">{selectedCustomer.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">Wallet Balance:</span>
                  <span className="text-violet-600 font-bold text-sm block font-mono">${Number(selectedCustomer.cardBalance || 0).toFixed(2)}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="topup-amount" className="text-xs font-semibold text-slate-700">Top-up Value ($)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">$</span>
                  <Input
                    id="topup-amount"
                    type="number"
                    step="0.01"
                    value={balanceAmount}
                    onChange={(e) => setBalanceAmount(e.target.value)}
                    placeholder="50.00"
                    className="pl-7"
                  />
                </div>
                <p className="text-[10px] text-slate-400">Loads monetary balance to be spent at checkout terminals.</p>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setBalanceDialogOpen(false)}>Cancel</Button>
          <Button onClick={saveBalance}>Add Balance</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

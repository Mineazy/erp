'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { CreditCard, Plus, Search, Download, Eye } from 'lucide-react';

interface APRecord {
  id: string;
  billNumber: string;
  supplierName: string;
  billDate: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  balance: number;
  status: string;
}

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'default'> = {
  paid: 'success',
  partial: 'warning',
  pending: 'default',
  overdue: 'destructive',
};

const emptyForm = { supplierName: '', billDate: '', dueDate: '', amount: 0 };

export default function APPage() {
  const [data, setData] = useState<APRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/financial/ap?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch AP', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search, statusFilter]);

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/financial/ap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Create failed' }));
        alert(err.error || 'Failed to create bill');
        return;
      }
      setDialogOpen(false);
      setForm(emptyForm);
      fetchData();
    } catch (e) {
      alert('Network error. Please try again.');
    }
  };

  const totalOutstanding = data.reduce((s, r) => s + r.balance, 0);
  const overdueTotal = data.filter(r => r.status === 'overdue').reduce((s, r) => s + r.balance, 0);
  const paidTotal = data.filter(r => r.status === 'paid').reduce((s, r) => s + r.amount, 0);

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Accounts Payable</h2>
          <p className="text-slate-500 mt-1">Track supplier bills and payments</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          New Bill
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Outstanding</p>
              <p className="text-xl font-bold text-slate-900">${totalOutstanding.toLocaleString()}</p>
            </div>
            <div className="p-2 bg-red-50 rounded-lg"><CreditCard className="h-5 w-5 text-red-600" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Overdue</p>
              <p className="text-xl font-bold text-red-600">${overdueTotal.toLocaleString()}</p>
            </div>
            <div className="p-2 bg-red-50 rounded-lg"><CreditCard className="h-5 w-5 text-red-600" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Paid This Month</p>
              <p className="text-xl font-bold text-green-600">${paidTotal.toLocaleString()}</p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg"><CreditCard className="h-5 w-5 text-green-600" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Bills</p>
              <p className="text-xl font-bold text-slate-900">{data.length}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg"><CreditCard className="h-5 w-5 text-mine-blue-800" /></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Bills</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="text" placeholder="Search bills..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-64" />
              </div>
              <Select options={[{ value: '', label: 'All Status' }, ...Object.keys(statusVariant).map(k => ({ value: k, label: k.charAt(0).toUpperCase() + k.slice(1) }))]} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-36" />
              <Button variant="outline" size="sm" onClick={() => window.print()}><Download className="h-4 w-4 mr-2" />Export</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell className="font-mono text-sm font-medium">{bill.billNumber}</TableCell>
                  <TableCell>{bill.supplierName}</TableCell>
                  <TableCell>{bill.billDate}</TableCell>
                  <TableCell>{bill.dueDate}</TableCell>
                  <TableCell className="text-right font-mono">{bill.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono">{bill.paidAmount.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{bill.balance.toLocaleString()}</TableCell>
                  <TableCell><Badge variant={statusVariant[bill.status]}>{bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}</Badge></TableCell>
                  <TableCell className="text-right">
                    <button onClick={() => alert(`Bill: ${bill.billNumber}\nSupplier: ${bill.supplierName}\nBalance: $${bill.balance.toLocaleString()}\nStatus: ${bill.status}`)} className="p-1.5 hover:bg-slate-100 rounded"><Eye className="h-4 w-4 text-slate-400" /></button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="New Bill" size="md">
        <div className="space-y-4">
          <Input label="Supplier Name" value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} placeholder="e.g. Equip Co" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Bill Date" type="date" value={form.billDate} onChange={(e) => setForm({ ...form, billDate: e.target.value })} />
            <Input label="Due Date" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
          <Input label="Amount" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate}>Create Bill</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

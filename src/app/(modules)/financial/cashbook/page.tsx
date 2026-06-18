'use client';

import { toast, dismissToast } from '@/components/ui/toast';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Wallet, Plus, Search, Download, ArrowUpRight, ArrowDownRight, ArrowLeftRight } from 'lucide-react';

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  children?: Account[];
}

interface CashbookEntry {
  id: string;
  entryNumber: string;
  entryDate: string;
  type: 'receipt' | 'payment' | 'transfer';
  description: string;
  amount: number;
  reference: string;
  status: string;
}

const typeIcons = { receipt: ArrowUpRight, payment: ArrowDownRight, transfer: ArrowLeftRight };
const typeColors = { receipt: 'text-green-600 bg-green-50', payment: 'text-red-600 bg-red-50', transfer: 'text-blue-600 bg-blue-50' };

const emptyForm = { entryDate: '', type: 'receipt', description: '', amount: 0, reference: '', accountId: '' };

export default function CashbookPage() {
  const [data, setData] = useState<CashbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    fetch('/api/financial/coa')
      .then(r => r.json())
      .then(setAccounts)
      .catch(() => {});
  }, []);

  function flattenAccounts(list: Account[], depth = 0): { value: string; label: string }[] {
    const result: { value: string; label: string }[] = [];
    for (const a of list) {
      result.push({ value: a.id, label: `${'  '.repeat(depth)}${a.code} - ${a.name}` });
      if (a.children?.length) result.push(...flattenAccounts(a.children, depth + 1));
    }
    return result;
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (typeFilter) params.set('type', typeFilter);
      const res = await fetch(`/api/financial/cashbook?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch cashbook', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search, typeFilter]);

  const handleCreate = async () => {
    try {
      const tid = toast('Saving entry...', 'info', 120000);
      let res;
      try {
        res = await fetch('/api/financial/cashbook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Create failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to create entry', 'error');
        return;
      }
      dismissToast(tid);
      toast('Entry created successfully', 'success');
      setDialogOpen(false);
      setForm(emptyForm);
      fetchData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  const totalReceipts = data.filter(e => e.type === 'receipt').reduce((s, e) => s + e.amount, 0);
  const totalPayments = data.filter(e => e.type === 'payment').reduce((s, e) => s + e.amount, 0);

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Cashbook</h2>
          <p className="text-slate-500 mt-1">Track cash receipts and payments</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          New Entry
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500 mb-1">Total Receipts</p>
            <p className="text-2xl font-bold text-green-600">${totalReceipts.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500 mb-1">Total Payments</p>
            <p className="text-2xl font-bold text-red-600">${totalPayments.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500 mb-1">Net Cash Flow</p>
            <p className={`text-2xl font-bold ${totalReceipts - totalPayments >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${(totalReceipts - totalPayments).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5 text-mine-blue-800" />
              Cashbook Entries
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-64" />
              </div>
              <Select options={[{ value: '', label: 'All Types' }, { value: 'receipt', label: 'Receipts' }, { value: 'payment', label: 'Payments' }, { value: 'transfer', label: 'Transfers' }]} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-36" />
              <Button variant="outline" size="sm" onClick={() => window.print()}><Download className="h-4 w-4 mr-2" />Export</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entry #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((entry) => {
                const TypeIcon = typeIcons[entry.type];
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-sm">{entry.entryNumber}</TableCell>
                    <TableCell>{entry.entryDate}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${typeColors[entry.type]}`}>
                        <TypeIcon className="h-3 w-3" />
                        {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                    <TableCell className="text-xs text-slate-500">{entry.reference || '-'}</TableCell>
                    <TableCell className={`text-right font-mono font-medium ${entry.type === 'receipt' ? 'text-green-600' : 'text-red-600'}`}>
                      {entry.type === 'receipt' ? '+' : '-'}${entry.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.status === 'posted' ? 'success' : 'default'}>
                        {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="New Cashbook Entry" size="md">
        <div className="space-y-4">
          <Input label="Date" type="date" value={form.entryDate} onChange={(e) => setForm({ ...form, entryDate: e.target.value })} />
          <Select label="Type" options={[{ value: 'receipt', label: 'Receipt' }, { value: 'payment', label: 'Payment' }, { value: 'transfer', label: 'Transfer' }]} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
          <Select label="Account" options={flattenAccounts(accounts)} value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })} />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Customer payment" />
          <Input label="Amount" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
          <Input label="Reference" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="e.g. INV-2026-0001" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate}>Create Entry</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

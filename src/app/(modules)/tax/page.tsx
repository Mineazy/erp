'use client';

import { toast, dismissToast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Percent, Plus, Search, Edit2, Trash2 } from 'lucide-react';

interface TaxType {
  id: string;
  code: string;
  name: string;
  category: string;
  rate: number;
  isActive: boolean;
}

const categories = [
  { value: 'vat', label: 'VAT' },
  { value: 'paye', label: 'PAYE' },
  { value: 'corporate_tax', label: 'Corporate Tax' },
  { value: 'withholding_tax', label: 'Withholding Tax' },
  { value: 'capital_gains_tax', label: 'Capital Gains Tax' },
  { value: 'aids_levy', label: 'AIDS Levy' },
  { value: 'nssa', label: 'NSSA' },
  { value: 'nec', label: 'NEC' },
  { value: 'zimdef', label: 'ZIMDEF' },
];

const emptyForm = { code: '', name: '', category: 'vat', rate: 0, isActive: true };

export default function TaxPage() {
  const [data, setData] = useState<TaxType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<TaxType | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/tax?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch tax types', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search]);

  const openCreate = () => {
    setEditingTax(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (tax: TaxType) => {
    setEditingTax(tax);
    setForm({ code: tax.code, name: tax.name, category: tax.category, rate: tax.rate, isActive: tax.isActive });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      let res;
      let tid;
      if (editingTax) {
        tid = toast('Updating tax type...', 'info', 120000);
        try {
          res = await fetch(`/api/tax/${editingTax.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });
        } catch (e) { dismissToast(tid); throw e; }
      } else {
        tid = toast('Saving tax type...', 'info', 120000);
        try {
          res = await fetch('/api/tax', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });
        } catch (e) { dismissToast(tid); throw e; }
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to save tax type', 'error');
        return;
      }
      dismissToast(tid);
      toast((editingTax ? 'Tax type updated' : 'Tax type created') + ' successfully', 'success');
      setDialogOpen(false);
      setEditingTax(null);
      fetchData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({ title: 'Delete Tax Type', message: 'Are you sure you want to delete this tax type?', variant: 'danger' }); if (!ok) return;
    try {
      const tid = toast('Deleting tax type...', 'info', 120000);
      let res;
      try {
        res = await fetch(`/api/tax/${id}`, { method: 'DELETE' });
      } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Delete failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to delete tax type', 'error');
        return;
      }
      dismissToast(tid);
      toast('Tax type deleted successfully', 'success');
      fetchData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Tax Engine</h2>
          <p className="text-slate-500 mt-1">Manage tax types and rates</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Tax Type
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Active Tax Types</p>
            <p className="text-xl font-bold text-green-600">{data.filter(t => t.isActive).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Total Tax Types</p>
            <p className="text-xl font-bold text-slate-900">{data.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">VAT</p>
            <p className="text-xl font-bold text-mine-blue-800">{data.filter(t => t.category === 'vat').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">PAYE</p>
            <p className="text-xl font-bold text-amber-600">{data.filter(t => t.category === 'paye').length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Percent className="h-5 w-5 text-mine-blue-800" />
              Tax Types
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search tax types..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Rate %</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((tax) => (
                <TableRow key={tax.id} className={!tax.isActive ? 'opacity-60' : ''}>
                  <TableCell className="font-mono text-xs">{tax.code}</TableCell>
                  <TableCell className="font-medium">{tax.name}</TableCell>
                  <TableCell className="text-xs text-slate-600 capitalize">{tax.category.replace(/_/g, ' ')}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{tax.rate}%</TableCell>
                  <TableCell>
                    <Badge variant={tax.isActive ? 'success' : 'secondary'}>{tax.isActive ? 'Active' : 'Inactive'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(tax)} className="p-1.5 hover:bg-slate-100 rounded"><Edit2 className="h-4 w-4 text-slate-400" /></button>
                      <button onClick={() => handleDelete(tax.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-red-400" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditingTax(null); }} title={editingTax ? 'Edit Tax Type' : 'Add Tax Type'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. VAT-15" />
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Value Added Tax" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Category" options={categories} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <Input label="Rate (%)" type="number" min="0" max="100" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })} />
          </div>
          <Checkbox label="Active" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingTax(null); }}>Cancel</Button>
          <Button onClick={handleSave}>{editingTax ? 'Update' : 'Create'}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

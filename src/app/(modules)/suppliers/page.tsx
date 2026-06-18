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
import { Building2, Plus, Search, Edit2, Trash2, TrendingUp, ShieldCheck, Ban } from 'lucide-react';

interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  city: string;
  paymentTerms: string;
  category: string;
  itf263Status: string;
  performanceScore: number;
  blacklisted: boolean;
  balance: number;
  isActive: boolean;
}

const emptyForm = {
  code: '', name: '', contactPerson: '', email: '', phone: '',
  city: '', paymentTerms: 'Net 30', category: 'raw_materials',
  itf263Status: 'pending', performanceScore: 0, blacklisted: false,
};

const itfStatusColors: Record<string, string> = {
  compliant: 'bg-green-50 text-green-700',
  pending: 'bg-amber-50 text-amber-700',
  non_compliant: 'bg-red-50 text-red-700',
  exempt: 'bg-blue-50 text-blue-700',
};

const categoryOptions = [
  { value: 'raw_materials', label: 'Raw Materials' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'services', label: 'Services' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'technology', label: 'Technology' },
  { value: 'other', label: 'Other' },
];

const itfStatusOptions = [
  { value: 'compliant', label: 'Compliant' },
  { value: 'pending', label: 'Pending' },
  { value: 'non_compliant', label: 'Non-Compliant' },
  { value: 'exempt', label: 'Exempt' },
];

export default function SuppliersPage() {
  const [data, setData] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/suppliers?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch suppliers', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search]);

  const openCreate = () => {
    setEditingSupplier(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setForm({
      code: supplier.code, name: supplier.name,
      contactPerson: supplier.contactPerson, email: supplier.email,
      phone: supplier.phone, city: supplier.city,
      paymentTerms: supplier.paymentTerms, category: supplier.category,
      itf263Status: supplier.itf263Status,
      performanceScore: supplier.performanceScore,
      blacklisted: supplier.blacklisted,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      let res;
      let tid;
      if (editingSupplier) {
        tid = toast('Updating supplier...', 'info', 120000);
        try {
          res = await fetch(`/api/suppliers/${editingSupplier.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });
        } catch (e) { dismissToast(tid); throw e; }
      } else {
        tid = toast('Saving supplier...', 'info', 120000);
        try {
          res = await fetch('/api/suppliers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });
        } catch (e) { dismissToast(tid); throw e; }
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to save supplier', 'error');
        return;
      }
      dismissToast(tid);
      toast((editingSupplier ? 'Supplier updated' : 'Supplier created') + ' successfully', 'success');
      setDialogOpen(false);
      setEditingSupplier(null);
      fetchData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({ title: 'Delete Supplier', message: 'Are you sure you want to delete this supplier?', variant: 'danger' }); if (!ok) return;
    try {
      const tid = toast('Deleting supplier...', 'info', 120000);
      let res;
      try {
        res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
      } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Delete failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to delete supplier', 'error');
        return;
      }
      dismissToast(tid);
      toast('Supplier deleted successfully', 'success');
      fetchData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  const active = data.filter(s => s.isActive).length;
  const blacklisted = data.filter(s => s.blacklisted).length;
  const avgScore = data.length ? Math.round(data.reduce((s, c) => s + c.performanceScore, 0) / data.length) : 0;

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Suppliers</h2>
          <p className="text-slate-500 mt-1">Manage supplier relationships and ITF263 compliance</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Supplier
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Total Suppliers</p>
            <p className="text-xl font-bold text-slate-900">{data.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Active</p>
            <p className="text-xl font-bold text-green-600">{active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm text-slate-500">Blacklisted</p>
                <p className="text-xl font-bold text-red-600">{blacklisted}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-mine-blue-800" />
              <div>
                <p className="text-sm text-slate-500">Avg Performance</p>
                <p className="text-xl font-bold text-mine-blue-800">{avgScore}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-mine-blue-800" />
              Supplier List
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>ITF263 Status</TableHead>
                <TableHead>Payment Terms</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-center">Performance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((supplier) => (
                <TableRow key={supplier.id} className={!supplier.isActive || supplier.blacklisted ? 'opacity-60' : ''}>
                  <TableCell className="font-mono text-xs">{supplier.code}</TableCell>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${itfStatusColors[supplier.itf263Status] || 'bg-slate-50 text-slate-700'}`}>
                      {supplier.itf263Status}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">{supplier.paymentTerms}</TableCell>
                  <TableCell className="text-xs text-slate-600">{supplier.category}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <div className="w-16 bg-slate-200 rounded-full h-2">
                        <div className="bg-mine-blue-800 h-2 rounded-full" style={{ width: `${supplier.performanceScore}%` }} />
                      </div>
                      <span className="text-xs font-mono">{supplier.performanceScore}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {supplier.blacklisted ? (
                      <Badge variant="destructive">Blacklisted</Badge>
                    ) : (
                      <Badge variant={supplier.isActive ? 'success' : 'secondary'}>
                        {supplier.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(supplier)} className="p-1.5 hover:bg-slate-100 rounded"><Edit2 className="h-4 w-4 text-slate-400" /></button>
                      <button onClick={() => handleDelete(supplier.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-red-400" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditingSupplier(null); }} title={editingSupplier ? 'Edit Supplier' : 'Add Supplier'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Supplier Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. SUP-006" />
            <Input label="Supplier Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. New Supplier Ltd" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Contact Person" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} placeholder="Full name" />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@supplier.com" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+263 71 234 5678" />
            <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Harare" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Payment Terms" options={[{ value: 'Net 15', label: 'Net 15' }, { value: 'Net 30', label: 'Net 30' }, { value: 'Net 45', label: 'Net 45' }, { value: 'Net 60', label: 'Net 60' }]} value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} />
            <Select label="Category" options={categoryOptions} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="ITF263 Status" options={itfStatusOptions} value={form.itf263Status} onChange={(e) => setForm({ ...form, itf263Status: e.target.value })} />
            <Input label="Performance Score (%)" type="number" value={form.performanceScore} onChange={(e) => setForm({ ...form, performanceScore: Number(e.target.value) })} placeholder="0-100" min={0} max={100} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="blacklisted" checked={form.blacklisted} onChange={(e) => setForm({ ...form, blacklisted: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-mine-blue-800 focus:ring-mine-blue-500" />
            <label htmlFor="blacklisted" className="text-sm text-slate-700">Blacklisted</label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingSupplier(null); }}>Cancel</Button>
          <Button onClick={handleSave}>{editingSupplier ? 'Update' : 'Create'}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

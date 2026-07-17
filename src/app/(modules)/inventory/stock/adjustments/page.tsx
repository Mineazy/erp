'use client';

import { toast, dismissToast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle, Plus, Search, Edit2, Trash2, Package } from 'lucide-react';
import { ADJUSTMENT_TYPES } from '@/lib/constants';

interface Adjustment {
  id: string;
  adjustmentNo: string;
  product: { id: string; code: string; name: string };
  adjustmentType: string;
  quantity: number;
  currentStock: number;
  newStock: number;
  reason: string;
  createdAt: string;
}

interface ProductResult { id: string; code: string; name: string; stock: number }

const badgeVariant: Record<string, 'default' | 'destructive' | 'warning' | 'secondary'> = {
  adjustment: 'default',
  loss: 'destructive',
  damaged: 'warning',
  expired: 'warning',
  write_off: 'secondary',
};

const badgeClass: Record<string, string> = {
  adjustment: 'bg-blue-100 text-blue-800',
  loss: 'bg-red-100 text-red-800',
  damaged: 'bg-orange-100 text-orange-800',
  expired: 'bg-yellow-100 text-yellow-800',
  write_off: 'bg-gray-100 text-gray-800',
};

const emptyForm = { productId: '', productCode: '', productName: '', currentStock: 0, adjustmentType: '', quantity: 0, reason: '' };

export default function AdjustmentsPage() {
  const [data, setData] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Adjustment | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [pSearch, setPSearch] = useState('');
  const [pResults, setPResults] = useState<ProductResult[]>([]);
  const [pOpen, setPOpen] = useState(false);
  const pRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/inventory/stock/adjustments?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json.items ?? json);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const searchProducts = async (q: string) => {
    if (!q.trim()) { setPResults([]); setPOpen(false); return; }
    try {
      const res = await fetch(`/api/inventory/products?search=${encodeURIComponent(q)}`);
      if (!res.ok) return;
      const json = await res.json();
      const items = json.items ?? json;
      setPResults(items);
      setPOpen(true);
    } catch (_) { setPResults([]); }
  };

  useEffect(() => { fetchData(); }, [search]);

  useEffect(() => {
    const handler = setTimeout(() => searchProducts(pSearch), 300);
    return () => clearTimeout(handler);
  }, [pSearch]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => { if (pRef.current && !pRef.current.contains(e.target as Node)) setPOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectProduct = (p: ProductResult) => {
    setForm({ ...form, productId: p.id, productCode: p.code, productName: p.name, currentStock: p.stock });
    setPSearch(`${p.code} — ${p.name}`);
    setPOpen(false);
  };

  const byType: Record<string, Adjustment[]> = {};
  data.forEach((a) => { if (!byType[a.adjustmentType]) byType[a.adjustmentType] = []; byType[a.adjustmentType].push(a); });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setPSearch('');
    setPResults([]);
    setDialogOpen(true);
  };

  const openEdit = (a: Adjustment) => {
    setEditing(a);
    setForm({ productId: a.product.id, productCode: a.product.code, productName: a.product.name, currentStock: a.currentStock, adjustmentType: a.adjustmentType, quantity: a.quantity, reason: a.reason });
    setPSearch(`${a.product.code} — ${a.product.name}`);
    setPResults([]);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      let res;
      let tid;
      const body = { productId: form.productId, adjustmentType: form.adjustmentType, quantity: form.quantity, reason: form.reason };
      if (editing) {
        tid = toast('Updating adjustment...', 'info', 120000);
        try { res = await fetch(`/api/inventory/stock/adjustments/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); } catch (e) { dismissToast(tid); throw e; }
      } else {
        tid = toast('Saving adjustment...', 'info', 120000);
        try { res = await fetch('/api/inventory/stock/adjustments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); } catch (e) { dismissToast(tid); throw e; }
      }
      if (!res.ok) { const err = await res.json().catch(() => ({ error: 'Save failed' })); dismissToast(tid); toast(err.error || 'Failed to save adjustment', 'error'); return; }
      dismissToast(tid);
      toast((editing ? 'Adjustment updated' : 'Adjustment created') + ' successfully', 'success');
      setDialogOpen(false);
      setEditing(null);
      fetchData();
    } catch { toast('Network error. Please try again.', 'error'); }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({ title: 'Delete Adjustment', message: 'Are you sure you want to delete this adjustment?', variant: 'danger' }); if (!ok) return;
    try {
      const tid = toast('Deleting adjustment...', 'info', 120000);
      let res;
      try { res = await fetch(`/api/inventory/stock/adjustments/${id}`, { method: 'DELETE' }); } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) { const err = await res.json().catch(() => ({ error: 'Delete failed' })); dismissToast(tid); toast(err.error || 'Failed to delete adjustment', 'error'); return; }
      dismissToast(tid);
      toast('Adjustment deleted successfully', 'success');
      fetchData();
    } catch { toast('Network error. Please try again.', 'error'); }
  };

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Stock Adjustments</h2>
          <p className="text-slate-500 mt-1">Manage inventory stock adjustments, losses, and write-offs</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />New Adjustment</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Adjustments</p>
              <p className="text-xl font-bold text-slate-900">{data.length}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg"><AlertTriangle className="h-5 w-5 text-blue-800" /></div>
          </CardContent>
        </Card>
        {ADJUSTMENT_TYPES.map((t) => (
          <Card key={t.value}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{t.label}</p>
                <p className="text-xl font-bold text-slate-900">{(byType[t.value] || []).length}</p>
              </div>
              <div className={`p-2 rounded-lg ${t.value === 'adjustment' ? 'bg-blue-50' : t.value === 'loss' ? 'bg-red-50' : t.value === 'damaged' ? 'bg-orange-50' : t.value === 'expired' ? 'bg-yellow-50' : 'bg-gray-50'}`}>
                <Package className={`h-5 w-5 ${t.value === 'adjustment' ? 'text-blue-800' : t.value === 'loss' ? 'text-red-600' : t.value === 'damaged' ? 'text-orange-600' : t.value === 'expired' ? 'text-yellow-600' : 'text-gray-600'}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-blue-800" />
              Adjustment Records
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search adjustments..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="text-center py-8 text-slate-400">No adjustments found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Adjustment No</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead className="text-right">New Stock</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs font-medium">{a.adjustmentNo}</TableCell>
                    <TableCell className="font-medium">{a.product.name}</TableCell>
                    <TableCell>
                      <Badge className={badgeClass[a.adjustmentType] || ''}>
                        {ADJUSTMENT_TYPES.find((t) => t.value === a.adjustmentType)?.label || a.adjustmentType}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-mono ${a.quantity < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {a.quantity > 0 ? '+' : ''}{a.quantity}
                    </TableCell>
                    <TableCell className="text-right font-mono">{a.currentStock}</TableCell>
                    <TableCell className="text-right font-mono">{a.newStock}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-slate-600">{a.reason || '—'}</TableCell>
                    <TableCell className="text-sm text-slate-600">{new Date(a.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(a)} className="p-1.5 hover:bg-slate-100 rounded"><Edit2 className="h-4 w-4 text-slate-400" /></button>
                        <button onClick={() => handleDelete(a.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-red-400" /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} title={editing ? 'Edit Adjustment' : 'New Adjustment'} size="lg">
        <div className="space-y-4">
          <div className="relative" ref={pRef}>
            <Input label="Product" value={pSearch} onChange={(e) => { setPSearch(e.target.value); setForm({ ...form, productId: '', productName: e.target.value }); }} placeholder="Search products..." />
            {pOpen && pResults.length > 0 && (
              <div className="absolute z-10 top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {pResults.map((p) => (
                  <button key={p.id} type="button" onClick={() => selectProduct(p)} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center justify-between">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-slate-400 font-mono">{p.code} (Stock: {p.stock})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Product Code" value={form.productCode} disabled placeholder="Auto-filled" />
            <Input label="Current Stock" type="number" value={form.currentStock} disabled placeholder="Auto-filled" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Adjustment Type" options={ADJUSTMENT_TYPES.map((t) => ({ value: t.value, label: t.label }))} placeholder="Select type" value={form.adjustmentType} onChange={(e) => setForm({ ...form, adjustmentType: e.target.value })} />
            <Input label="Quantity" type="number" step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })} placeholder="Negative to reduce stock" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
            <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" placeholder="Reason for adjustment..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setDialogOpen(false); setEditing(null); }}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.productId || !form.adjustmentType}>{editing ? 'Update' : 'Create'}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

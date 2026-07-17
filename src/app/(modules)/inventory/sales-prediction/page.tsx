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
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { LineChart, Plus, Search, Trash2, Package, Building2, TrendingUp, TrendingDown } from 'lucide-react';
import { FORECAST_TRENDS } from '@/lib/constants';

interface Prediction {
  id: string;
  product?: { id: string; name: string; code: string } | null;
  branch?: { id: string; name: string } | null;
  predictedDate: string;
  predictedQty: number;
  predictedAmount: number | null;
  confidenceLevel: number;
  trend: string;
  actualQty: number | null;
  variance: number | null;
}

interface Product { id: string; name: string; code: string }
interface Branch { id: string; name: string }

const emptyForm = { productId: '', branchId: '', predictedDate: '', predictedQty: 0, predictedAmount: undefined as number | undefined, confidenceLevel: 0.8, trend: 'stable' };

export default function SalesPredictionPage() {
  const [data, setData] = useState<Prediction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (branchFilter) params.set('branchId', branchFilter);
      const res = await fetch(`/api/inventory/sales-prediction?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json.items ?? json);
    } catch (e) {
      console.error('Failed to fetch predictions', e);
    } finally { setLoading(false); }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/inventory/products');
      if (res.ok) { const json = await res.json(); setProducts(json.items ?? json); }
    } catch (_) {}
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/admin/branches');
      if (res.ok) { const json = await res.json(); setBranches(json.data || json); }
    } catch (_) {}
  };

  useEffect(() => { fetchData(); }, [search, branchFilter]);
  useEffect(() => { fetchProducts(); }, []);
  useEffect(() => { fetchBranches(); }, []);

  const upwardCount = data.filter((p) => p.trend === 'up').length;
  const downwardCount = data.filter((p) => p.trend === 'down').length;
  const avgConfidence = data.length ? data.reduce((a, b) => a + b.confidenceLevel, 0) / data.length : 0;

  const openCreate = () => { setForm(emptyForm); setDialogOpen(true); };

  const handleSave = async () => {
    try {
      setSaving(true);
      const tid = toast('Saving prediction...', 'info', 120000);
      let res;
      try {
        res = await fetch('/api/inventory/sales-prediction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, predictedAmount: form.predictedAmount || null }),
        });
      } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to save prediction', 'error');
        return;
      }
      dismissToast(tid);
      toast('Prediction created successfully', 'success');
      setDialogOpen(false);
      fetchData();
    } catch (e) { toast('Network error. Please try again.', 'error'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({ title: 'Delete Prediction', message: 'Are you sure you want to delete this prediction?', variant: 'danger' }); if (!ok) return;
    try {
      const tid = toast('Deleting prediction...', 'info', 120000);
      let res;
      try { res = await fetch(`/api/inventory/sales-prediction/${id}`, { method: 'DELETE' }); } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Delete failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to delete prediction', 'error');
        return;
      }
      dismissToast(tid);
      toast('Prediction deleted successfully', 'success');
      fetchData();
    } catch (e) { toast('Network error. Please try again.', 'error'); }
  };

  const handleGenerate = async () => {
    try {
      const tid = toast('Generating predictions...', 'info', 120000);
      let res;
      try { res = await fetch('/api/inventory/sales-prediction', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ generate: true }) }); } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Generation failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to generate predictions', 'error');
        return;
      }
      dismissToast(tid);
      toast('Predictions generated successfully', 'success');
      fetchData();
    } catch (e) { toast('Network error. Please try again.', 'error'); }
  };

  const confidenceBadge = (level: number) => {
    if (level < 0.5) return <Badge variant="warning">Low</Badge>;
    if (level <= 0.8) return <Badge variant="default">Medium</Badge>;
    return <Badge variant="success">High</Badge>;
  };

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Sales Prediction</h2>
          <p className="text-slate-500 mt-1">Predict future sales based on historical data</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleGenerate}>
            <TrendingUp className="h-4 w-4 mr-2" /> Generate Predictions
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Add Prediction
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Predictions</p>
              <p className="text-xl font-bold text-slate-900">{data.length}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg"><LineChart className="h-5 w-5 text-blue-800" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Upward Trending</p>
              <p className="text-xl font-bold text-green-600">{upwardCount}</p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg"><TrendingUp className="h-5 w-5 text-green-600" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Downward Trending</p>
              <p className="text-xl font-bold text-red-600">{downwardCount}</p>
            </div>
            <div className="p-2 bg-red-50 rounded-lg"><TrendingDown className="h-5 w-5 text-red-600" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Avg Confidence</p>
              <p className="text-xl font-bold text-slate-900">{(avgConfidence * 100).toFixed(0)}%</p>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg"><Package className="h-5 w-5 text-purple-600" /></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <LineChart className="h-5 w-5 text-blue-800" /> Prediction List
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select options={[{ value: '', label: 'All Branches' }, ...branches.map((b) => ({ value: b.id, label: b.name }))]} value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="w-48" />
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="text" placeholder="Search predictions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No predictions found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Predicted Date</TableHead>
                  <TableHead className="text-right">Predicted Qty</TableHead>
                  <TableHead className="text-right">Predicted Amount</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Trend</TableHead>
                  <TableHead className="text-right">Actual Qty</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.product?.name || '—'}</TableCell>
                    <TableCell className="text-xs text-slate-600">{p.branch?.name || '—'}</TableCell>
                    <TableCell className="text-xs text-slate-600">{new Date(p.predictedDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right font-mono">{p.predictedQty.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono">{p.predictedAmount != null ? `$${p.predictedAmount.toLocaleString()}` : '—'}</TableCell>
                    <TableCell>{confidenceBadge(p.confidenceLevel)}</TableCell>
                    <TableCell>
                      {p.trend === 'up' ? <TrendingUp className="h-4 w-4 text-green-500" /> : p.trend === 'down' ? <TrendingDown className="h-4 w-4 text-red-500" /> : <span className="text-slate-400">—</span>}
                    </TableCell>
                    <TableCell className="text-right font-mono">{p.actualQty != null ? p.actualQty.toLocaleString() : '—'}</TableCell>
                    <TableCell className="text-right font-mono">{p.variance != null ? `${p.variance > 0 ? '+' : ''}${p.variance.toFixed(1)}%` : '—'}</TableCell>
                    <TableCell className="text-right">
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-red-400" /></button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Add Prediction" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Product" options={products.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))} placeholder="Search and select product" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} />
            <Select label="Branch" options={branches.map((b) => ({ value: b.id, label: b.name }))} placeholder="Select branch" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Predicted Date" type="date" value={form.predictedDate} onChange={(e) => setForm({ ...form, predictedDate: e.target.value })} />
            <Input label="Predicted Qty" type="number" step="0.01" value={form.predictedQty} onChange={(e) => setForm({ ...form, predictedQty: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Predicted Amount (optional)" type="number" step="0.01" value={form.predictedAmount ?? ''} onChange={(e) => setForm({ ...form, predictedAmount: e.target.value ? parseFloat(e.target.value) : undefined })} />
            <Input label="Confidence Level (0–1)" type="number" step="0.05" min="0" max="1" value={form.confidenceLevel} onChange={(e) => setForm({ ...form, confidenceLevel: parseFloat(e.target.value) || 0 })} />
          </div>
          <Select label="Trend" options={FORECAST_TRENDS.map((t) => ({ value: t.value, label: t.label }))} placeholder="Select trend" value={form.trend} onChange={(e) => setForm({ ...form, trend: e.target.value })} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Create</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

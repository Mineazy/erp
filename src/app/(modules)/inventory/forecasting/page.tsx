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
import { TrendingUp, Plus, Search, Trash2, Package, Calendar } from 'lucide-react';
import { FORECAST_TRENDS } from '@/lib/constants';

interface Forecast {
  id: string;
  product?: { id: string; name: string; code: string } | null;
  forecastDate: string;
  predictedDemand: number;
  confidenceLevel: number;
  seasonalPattern: string;
  reorderPoint?: number | null;
  reorderQuantity?: number | null;
  predictedStockoutDate?: string | null;
  createdAt: string;
}

interface Product { id: string; name: string; code: string }

interface Recommendation {
  productId: string;
  productName: string;
  currentStock: number;
  recommendedReorderPoint: number;
  recommendedReorderQty: number;
  daysUntilStockout: number | null;
}

const emptyForm = { productId: '', forecastDate: '', predictedDemand: 0, confidenceLevel: 0.8, seasonalPattern: 'stable', reorderPoint: undefined as number | undefined, reorderQuantity: undefined as number | undefined, predictedStockoutDate: '' };

export default function ForecastingPage() {
  const [data, setData] = useState<Forecast[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [recsOpen, setRecsOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/inventory/forecasting?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json.items ?? json);
    } catch (e) {
      console.error('Failed to fetch forecasts', e);
    } finally { setLoading(false); }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/inventory/products');
      if (res.ok) { const json = await res.json(); setProducts(json.items ?? json); }
    } catch (_) {}
  };

  useEffect(() => { fetchData(); }, [search]);
  useEffect(() => { fetchProducts(); }, []);

  const stockoutSoon = data.filter((f) => {
    if (!f.predictedStockoutDate) return false;
    return new Date(f.predictedStockoutDate).getTime() - Date.now() <= 30 * 24 * 60 * 60 * 1000;
  });

  const needsReorder = data.filter((f) => f.reorderPoint != null && f.reorderQuantity != null);

  const openCreate = () => { setForm(emptyForm); setDialogOpen(true); };

  const handleSave = async () => {
    try {
      setSaving(true);
      const tid = toast('Saving forecast...', 'info', 120000);
      let res;
      try {
        res = await fetch('/api/inventory/forecasting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, reorderPoint: form.reorderPoint || null, reorderQuantity: form.reorderQuantity || null, predictedStockoutDate: form.predictedStockoutDate || null }),
        });
      } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to save forecast', 'error');
        return;
      }
      dismissToast(tid);
      toast('Forecast created successfully', 'success');
      setDialogOpen(false);
      fetchData();
    } catch (e) { toast('Network error. Please try again.', 'error'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({ title: 'Delete Forecast', message: 'Are you sure you want to delete this forecast?', variant: 'danger' }); if (!ok) return;
    try {
      const tid = toast('Deleting forecast...', 'info', 120000);
      let res;
      try { res = await fetch(`/api/inventory/forecasting/${id}`, { method: 'DELETE' }); } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Delete failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to delete forecast', 'error');
        return;
      }
      dismissToast(tid);
      toast('Forecast deleted successfully', 'success');
      fetchData();
    } catch (e) { toast('Network error. Please try again.', 'error'); }
  };

  const fetchRecommendations = async () => {
    try {
      const res = await fetch('/api/inventory/optimization');
      if (!res.ok) throw new Error('Failed to fetch recommendations');
      const json = await res.json();
      setRecommendations(json.items ?? json);
      setRecsOpen(true);
    } catch (e) { toast('Failed to load recommendations', 'error'); }
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
          <h2 className="text-2xl font-bold text-slate-900">Inventory Forecasting</h2>
          <p className="text-slate-500 mt-1">Predict demand and manage reorder planning</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchRecommendations}>
            <TrendingUp className="h-4 w-4 mr-2" /> Recommendations
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> New Forecast
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Forecasts</p>
              <p className="text-xl font-bold text-slate-900">{data.length}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg"><TrendingUp className="h-5 w-5 text-blue-800" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Reorder Recommendations</p>
              <p className="text-xl font-bold text-amber-600">{needsReorder.length}</p>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg"><Package className="h-5 w-5 text-amber-600" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Predicted Stockouts (30d)</p>
              <p className="text-xl font-bold text-red-600">{stockoutSoon.length}</p>
            </div>
            <div className="p-2 bg-red-50 rounded-lg"><Calendar className="h-5 w-5 text-red-600" /></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-800" /> Forecast List
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search forecasts..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No forecasts found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Forecast Date</TableHead>
                  <TableHead className="text-right">Predicted Demand</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead className="text-right">Reorder Point</TableHead>
                  <TableHead className="text-right">Reorder Qty</TableHead>
                  <TableHead>Predicted Stockout</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.product?.name || '—'}</TableCell>
                    <TableCell className="text-xs text-slate-600">{new Date(f.forecastDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right font-mono">{f.predictedDemand.toLocaleString()}</TableCell>
                    <TableCell>{confidenceBadge(f.confidenceLevel)}</TableCell>
                    <TableCell className="text-right font-mono">{f.reorderPoint ?? '—'}</TableCell>
                    <TableCell className="text-right font-mono">{f.reorderQuantity ?? '—'}</TableCell>
                    <TableCell>
                      {f.predictedStockoutDate ? (
                        (() => {
                          const d = new Date(f.predictedStockoutDate);
                          return <Badge variant={d.getTime() - Date.now() <= 30 * 24 * 60 * 60 * 1000 ? 'destructive' : 'secondary'}>{d.toLocaleDateString()}</Badge>;
                        })()
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{new Date(f.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <button onClick={() => handleDelete(f.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-red-400" /></button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="New Forecast" size="lg">
        <div className="space-y-4">
          <Select label="Product" options={products.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))} placeholder="Search and select product" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Forecast Date" type="date" value={form.forecastDate} onChange={(e) => setForm({ ...form, forecastDate: e.target.value })} />
            <Input label="Predicted Demand" type="number" step="0.01" value={form.predictedDemand} onChange={(e) => setForm({ ...form, predictedDemand: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Confidence Level (0–1)" type="number" step="0.05" min="0" max="1" value={form.confidenceLevel} onChange={(e) => setForm({ ...form, confidenceLevel: parseFloat(e.target.value) || 0 })} />
            <Select label="Seasonal Pattern" options={FORECAST_TRENDS.map((t) => ({ value: t.value, label: t.label }))} placeholder="Select pattern" value={form.seasonalPattern} onChange={(e) => setForm({ ...form, seasonalPattern: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Reorder Point (optional)" type="number" step="0.01" value={form.reorderPoint ?? ''} onChange={(e) => setForm({ ...form, reorderPoint: e.target.value ? parseFloat(e.target.value) : undefined })} />
            <Input label="Reorder Quantity (optional)" type="number" step="0.01" value={form.reorderQuantity ?? ''} onChange={(e) => setForm({ ...form, reorderQuantity: e.target.value ? parseFloat(e.target.value) : undefined })} />
          </div>
          <Input label="Predicted Stockout Date (optional)" type="date" value={form.predictedStockoutDate} onChange={(e) => setForm({ ...form, predictedStockoutDate: e.target.value })} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Create</Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={recsOpen} onClose={() => setRecsOpen(false)} title="Reorder Recommendations" size="lg">
        <div className="space-y-4">
          {recommendations.length === 0 ? (
            <p className="text-slate-500 text-center py-4">No recommendations available</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead className="text-right">Rec. Reorder Point</TableHead>
                  <TableHead className="text-right">Rec. Reorder Qty</TableHead>
                  <TableHead>Days Until Stockout</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recommendations.map((r, i) => (
                  <TableRow key={r.productId || i}>
                    <TableCell className="font-medium">{r.productName}</TableCell>
                    <TableCell className="text-right font-mono">{r.currentStock}</TableCell>
                    <TableCell className="text-right font-mono">{r.recommendedReorderPoint}</TableCell>
                    <TableCell className="text-right font-mono">{r.recommendedReorderQty}</TableCell>
                    <TableCell>
                      {r.daysUntilStockout != null ? (
                        <Badge variant={r.daysUntilStockout <= 30 ? 'destructive' : 'success'}>{r.daysUntilStockout} days</Badge>
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setRecsOpen(false)}>Close</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
'use client';

import { toast, dismissToast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RECOMMENDATION_TYPES } from '@/lib/constants';
import { BarChart3, RefreshCw, CheckCircle, Package, AlertTriangle, ArrowRight } from 'lucide-react';

interface Recommendation {
  id: string;
  type: string;
  priority: string;
  productName: string;
  productCode: string;
  currentStock: number;
  suggestedAction: string;
  suggestedQty: number;
  reason: string;
  isApplied: boolean;
}

const typeVariants: Record<string, string> = {
  excess_stock: 'warning',
  slow_moving: 'info',
  dead_stock: 'destructive',
  redistribution: 'primary',
  reorder: 'success',
};

const priorityVariants: Record<string, string> = {
  high: 'destructive',
  medium: 'warning',
  low: 'info',
};

export default function OptimizationPage() {
  const [data, setData] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      if (priorityFilter) params.set('priority', priorityFilter);
      if (statusFilter) params.set('isApplied', statusFilter);
      const res = await fetch(`/api/inventory/optimization?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json.items ?? json);
    } catch (e) {
      console.error('Failed to fetch recommendations', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [typeFilter, priorityFilter, statusFilter]);

  const handleApply = async (rec: Recommendation) => {
    const ok = await confirmDialog({ title: 'Apply Recommendation', message: 'This will create a stock adjustment. Continue?', variant: 'info' });
    if (!ok) return;
    try {
      const tid = toast('Applying recommendation...', 'info', 120000);
      let res;
      try {
        res = await fetch(`/api/inventory/optimization/${rec.id}/apply`, { method: 'POST' });
      } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Apply failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to apply recommendation', 'error');
        return;
      }
      dismissToast(tid);
      toast('Recommendation applied successfully', 'success');
      fetchData();
    } catch {
      toast('Network error. Please try again.', 'error');
    }
  };

  const handleGenerate = async () => {
    const tid = toast('Generating recommendations...', 'info', 120000);
    try {
      const res = await fetch('/api/inventory/optimization', { method: 'POST' });
      dismissToast(tid);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Generation failed' }));
        toast(err.error || 'Failed to generate recommendations', 'error');
        return;
      }
      toast('Recommendations generated successfully', 'success');
      fetchData();
    } catch {
      dismissToast(tid);
      toast('Network error. Please try again.', 'error');
    }
  };

  const total = data.length;
  const pending = data.filter((r) => !r.isApplied).length;
  const applied = data.filter((r) => r.isApplied).length;
  const typeCounts = RECOMMENDATION_TYPES.reduce((acc, t) => ({ ...acc, [t.value]: data.filter((r) => r.type === t.value).length }), {} as Record<string, number>);

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Inventory Optimization</h2>
          <p className="text-slate-500 mt-1">Analyze and optimize your inventory levels</p>
        </div>
        <Button onClick={handleGenerate}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Generate Recommendations
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total</p>
              <p className="text-xl font-bold text-slate-900">{total}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg"><BarChart3 className="h-5 w-5 text-blue-600" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Pending</p>
              <p className="text-xl font-bold text-amber-600">{pending}</p>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Applied</p>
              <p className="text-xl font-bold text-green-600">{applied}</p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg"><CheckCircle className="h-5 w-5 text-green-600" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">By Type</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {RECOMMENDATION_TYPES.map((t) => (
                  typeCounts[t.value] > 0 && (
                    <span key={t.value} className="text-xs font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {t.label}: {typeCounts[t.value]}
                    </span>
                  )
                ))}
              </div>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg"><Package className="h-5 w-5 text-purple-600" /></div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-48">
          <Select
            options={[{ value: '', label: 'All Types' }, ...RECOMMENDATION_TYPES.map((t) => ({ value: t.value, label: t.label }))]}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Select
            options={[{ value: '', label: 'All Priorities' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }]}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Select
            options={[{ value: '', label: 'All Status' }, { value: 'false', label: 'Pending' }, { value: 'true', label: 'Applied' }]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No recommendations found</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Current Stock</TableHead>
              <TableHead>Suggested Action</TableHead>
              <TableHead className="text-right">Suggested Qty</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((rec) => (
              <TableRow key={rec.id}>
                <TableCell>
                  <div className="font-medium">{rec.productName}</div>
                  <div className="text-xs font-mono text-slate-400">{rec.productCode}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={(typeVariants[rec.type] || 'secondary') as any}>
                    {RECOMMENDATION_TYPES.find((t) => t.value === rec.type)?.label || rec.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">{rec.currentStock}</TableCell>
                <TableCell>{rec.suggestedAction}</TableCell>
                <TableCell className="text-right font-mono">{rec.suggestedQty}</TableCell>
                <TableCell>
                  <Badge variant={(priorityVariants[rec.priority] || 'secondary') as any}>
                    {rec.priority.charAt(0).toUpperCase() + rec.priority.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-xs truncate text-slate-500 text-sm">{rec.reason}</TableCell>
                <TableCell>
                  {rec.isApplied ? (
                    <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                      <CheckCircle className="h-4 w-4" />
                      Applied
                    </span>
                  ) : (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {!rec.isApplied && (
                    <Button size="sm" onClick={() => handleApply(rec)}>
                      <ArrowRight className="h-4 w-4 mr-1" />
                      Apply
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

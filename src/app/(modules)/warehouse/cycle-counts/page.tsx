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
import { ClipboardCheck, Plus, Search, Edit2, Trash2, Package } from 'lucide-react';

interface CycleCountLine {
  id?: string;
  productId: string;
  productName: string;
  expectedQty: number;
  countedQty: number;
  variance: number;
}

interface CycleCount {
  id: string;
  countNo: string;
  warehouseId: string;
  warehouse?: { id: string; name: string };
  status: string;
  countedBy: string;
  countedAt: string | null;
  lines?: CycleCountLine[];
}

interface WarehouseItem {
  id: string;
  name: string;
}

const emptyForm = { warehouseId: '', countedBy: '', lines: [] as CycleCountLine[] };

const statusBadgeVariant: Record<string, 'default' | 'warning' | 'success' | 'secondary'> = {
  draft: 'secondary',
  in_progress: 'warning',
  completed: 'success',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  in_progress: 'In Progress',
  completed: 'Completed',
};

export default function CycleCountsPage() {
  const [data, setData] = useState<CycleCount[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCount, setEditingCount] = useState<CycleCount | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/warehouse/cycle-counts?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch cycle counts', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await fetch('/api/warehouse');
      if (!res.ok) throw new Error('Failed to fetch warehouses');
      const json = await res.json();
      setWarehouses(json);
    } catch (e) {
      console.error('Failed to fetch warehouses', e);
    }
  };

  useEffect(() => { fetchWarehouses(); }, []);
  useEffect(() => { fetchData(); }, [search]);

  const warehouseOptions = warehouses.map((w) => ({ value: w.id, label: w.name }));

  const openCreate = () => {
    setEditingCount(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (count: CycleCount) => {
    setEditingCount(count);
    setForm({
      warehouseId: count.warehouseId,
      countedBy: count.countedBy || '',
      lines: count.lines?.map((l) => ({ ...l })) || [],
    });
    setDialogOpen(true);
  };

  const addLine = () => {
    setForm((prev) => ({
      ...prev,
      lines: [...prev.lines, { productId: '', productName: '', expectedQty: 0, countedQty: 0, variance: 0 }],
    }));
  };

  const removeLine = (index: number) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index),
    }));
  };

  const updateLine = (index: number, field: keyof CycleCountLine, value: string | number) => {
    setForm((prev) => {
      const lines = [...prev.lines];
      lines[index] = { ...lines[index], [field]: value };
      if (field === 'expectedQty' || field === 'countedQty') {
        lines[index].variance = lines[index].countedQty - lines[index].expectedQty;
      }
      return { ...prev, lines };
    });
  };

  const handleSave = async () => {
    try {
      let res;
      let tid;
      if (editingCount) {
        tid = toast('Updating cycle count...', 'info', 120000);
        try {
          res = await fetch(`/api/warehouse/cycle-counts/${editingCount.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });
        } catch (e) { dismissToast(tid); throw e; }
      } else {
        tid = toast('Saving cycle count...', 'info', 120000);
        try {
          res = await fetch('/api/warehouse/cycle-counts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });
        } catch (e) { dismissToast(tid); throw e; }
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to save cycle count', 'error');
        return;
      }
      dismissToast(tid);
      toast((editingCount ? 'Cycle count updated' : 'Cycle count created') + ' successfully', 'success');
      setDialogOpen(false);
      setEditingCount(null);
      fetchData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({ title: 'Delete Cycle Count', message: 'Are you sure you want to delete this cycle count?', variant: 'danger' }); if (!ok) return;
    try {
      const tid = toast('Deleting cycle count...', 'info', 120000);
      let res;
      try {
        res = await fetch(`/api/warehouse/cycle-counts/${id}`, { method: 'DELETE' });
      } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Delete failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to delete cycle count', 'error');
        return;
      }
      dismissToast(tid);
      toast('Cycle count deleted successfully', 'success');
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
          <h2 className="text-2xl font-bold text-slate-900">Cycle Counts</h2>
          <p className="text-slate-500 mt-1">Manage physical inventory counts</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Cycle Count
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Total Counts</p>
            <p className="text-xl font-bold text-slate-900">{data.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Draft</p>
            <p className="text-xl font-bold text-slate-600">{data.filter((c) => c.status === 'draft').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">In Progress</p>
            <p className="text-xl font-bold text-amber-600">{data.filter((c) => c.status === 'in_progress').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Completed</p>
            <p className="text-xl font-bold text-green-600">{data.filter((c) => c.status === 'completed').length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-mine-blue-800" />
              Cycle Count List
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search cycle counts..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Count No</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Counted By</TableHead>
                <TableHead>Counted At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((count) => (
                <TableRow key={count.id}>
                  <TableCell className="font-mono text-xs">{count.countNo}</TableCell>
                  <TableCell className="font-medium">{count.warehouse?.name || count.warehouseId}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant[count.status] || 'secondary'}>
                      {statusLabels[count.status] || count.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">{count.countedBy || '-'}</TableCell>
                  <TableCell className="text-xs text-slate-600">{count.countedAt ? new Date(count.countedAt).toLocaleDateString() : '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(count)} className="p-1.5 hover:bg-slate-100 rounded"><Edit2 className="h-4 w-4 text-slate-400" /></button>
                      <button onClick={() => handleDelete(count.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-red-400" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditingCount(null); }} title={editingCount ? 'Edit Cycle Count' : 'New Cycle Count'} size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Warehouse" options={warehouseOptions} value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })} placeholder="Select warehouse" />
            <Input label="Counted By" value={form.countedBy} onChange={(e) => setForm({ ...form, countedBy: e.target.value })} placeholder="e.g. John Doe" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Count Lines</label>
              <Button size="sm" variant="outline" onClick={addLine}>
                <Plus className="h-3 w-3 mr-1" />Add Line
              </Button>
            </div>
            {form.lines.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product ID</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead className="text-right">Expected Qty</TableHead>
                    <TableHead className="text-right">Counted Qty</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {form.lines.map((line, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <input type="text" value={line.productId} onChange={(e) => updateLine(index, 'productId', e.target.value)} className="w-20 text-xs border border-slate-200 rounded px-2 py-1" placeholder="ID" />
                      </TableCell>
                      <TableCell>
                        <input type="text" value={line.productName} onChange={(e) => updateLine(index, 'productName', e.target.value)} className="w-32 text-xs border border-slate-200 rounded px-2 py-1" placeholder="Product name" />
                      </TableCell>
                      <TableCell>
                        <input type="number" value={line.expectedQty} onChange={(e) => updateLine(index, 'expectedQty', parseInt(e.target.value) || 0)} className="w-20 text-xs border border-slate-200 rounded px-2 py-1 text-right" />
                      </TableCell>
                      <TableCell>
                        <input type="number" value={line.countedQty} onChange={(e) => updateLine(index, 'countedQty', parseInt(e.target.value) || 0)} className="w-20 text-xs border border-slate-200 rounded px-2 py-1 text-right" />
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        <span className={line.variance !== 0 ? 'text-red-600 font-semibold' : 'text-slate-600'}>
                          {line.variance >= 0 ? '+' : ''}{line.variance}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <button onClick={() => removeLine(index)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="h-3 w-3 text-red-400" /></button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {form.lines.length === 0 && (
              <p className="text-sm text-slate-400 py-4 text-center border border-dashed border-slate-200 rounded-md">No lines added yet. Click "Add Line" to begin.</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingCount(null); }}>Cancel</Button>
          <Button onClick={handleSave}>{editingCount ? 'Update' : 'Create'}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

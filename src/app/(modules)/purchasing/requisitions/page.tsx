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
import { ClipboardList, Plus, Search, Edit2, Trash2, Clock, CheckCircle, XCircle, FileText } from 'lucide-react';

interface RequisitionItem {
  productName: string;
  quantity: number;
  estimatedCost: number;
}

interface Requisition {
  id: string;
  requisitionNo: string;
  requestedBy: string;
  department: string;
  requiredDate: string;
  status: string;
  approvedBy: string;
  items: RequisitionItem[];
}

const emptyForm = { requestedBy: '', department: '', requiredDate: '', items: [{ productName: '', quantity: 1, estimatedCost: 0 }] };

export default function RequisitionsPage() {
  const [data, setData] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRequisition, setEditingRequisition] = useState<Requisition | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/purchasing/requisitions?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch requisitions', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search]);

  const openCreate = () => {
    setEditingRequisition(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (req: Requisition) => {
    setEditingRequisition(req);
    setForm({
      requestedBy: req.requestedBy,
      department: req.department,
      requiredDate: req.requiredDate,
      items: req.items.length ? req.items : [{ productName: '', quantity: 1, estimatedCost: 0 }],
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      let res;
      let tid;
      if (editingRequisition) {
        tid = toast('Updating requisition...', 'info', 120000);
        try {
          res = await fetch(`/api/purchasing/requisitions/${editingRequisition.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });
        } catch (e) { dismissToast(tid); throw e; }
      } else {
        tid = toast('Saving requisition...', 'info', 120000);
        try {
          res = await fetch('/api/purchasing/requisitions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });
        } catch (e) { dismissToast(tid); throw e; }
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to save requisition', 'error');
        return;
      }
      dismissToast(tid);
      toast((editingRequisition ? 'Requisition updated' : 'Requisition created') + ' successfully', 'success');
      setDialogOpen(false);
      setEditingRequisition(null);
      fetchData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({ title: 'Delete Requisition', message: 'Are you sure you want to delete this requisition?', variant: 'danger' }); if (!ok) return;
    try {
      const tid = toast('Deleting requisition...', 'info', 120000);
      let res;
      try {
        res = await fetch(`/api/purchasing/requisitions/${id}`, { method: 'DELETE' });
      } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Delete failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to delete requisition', 'error');
        return;
      }
      dismissToast(tid);
      toast('Requisition deleted successfully', 'success');
      fetchData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { productName: '', quantity: 1, estimatedCost: 0 }] });
  };

  const removeItem = (idx: number) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  };

  const updateItem = (idx: number, field: string, value: string | number) => {
    const items = [...form.items];
    (items[idx] as any)[field] = value;
    setForm({ ...form, items });
  };

  const statusBadge = (status: string) => {
    const variants: Record<string, 'warning' | 'success' | 'secondary' | 'destructive'> = {
      draft: 'secondary',
      pending_approval: 'warning',
      approved: 'success',
      rejected: 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status.replace(/_/g, ' ')}</Badge>;
  };

  const totalEstimated = data.reduce((sum, r) => sum + r.items.reduce((s, i) => s + i.quantity * i.estimatedCost, 0), 0);

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Purchase Requisitions</h2>
          <p className="text-slate-500 mt-1">Manage purchase requisitions</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Requisition
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Total</p>
            <p className="text-xl font-bold text-slate-900">{data.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Draft</p>
            <p className="text-xl font-bold text-slate-600">{data.filter(r => r.status === 'draft').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Pending Approval</p>
            <p className="text-xl font-bold text-amber-600">{data.filter(r => r.status === 'pending_approval').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Approved</p>
            <p className="text-xl font-bold text-green-600">{data.filter(r => r.status === 'approved').length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-mine-blue-800" />
              Requisition List
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search requisitions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requisition No</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Required Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Approved By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-mono text-xs">{req.requisitionNo}</TableCell>
                  <TableCell className="font-medium">{req.requestedBy}</TableCell>
                  <TableCell className="text-xs text-slate-600">{req.department}</TableCell>
                  <TableCell className="text-xs">{req.requiredDate}</TableCell>
                  <TableCell>{statusBadge(req.status)}</TableCell>
                  <TableCell className="text-xs text-slate-600">{req.approvedBy || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(req)} className="p-1.5 hover:bg-slate-100 rounded"><Edit2 className="h-4 w-4 text-slate-400" /></button>
                      <button onClick={() => handleDelete(req.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-red-400" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditingRequisition(null); }} title={editingRequisition ? 'Edit Requisition' : 'New Requisition'} size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Input label="Requested By" value={form.requestedBy} onChange={(e) => setForm({ ...form, requestedBy: e.target.value })} placeholder="Full name" />
            <Input label="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="e.g. Operations" />
            <Input label="Required Date" type="date" value={form.requiredDate} onChange={(e) => setForm({ ...form, requiredDate: e.target.value })} />
          </div>
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-700">Items</span>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-3 w-3 mr-1" /> Add Item
              </Button>
            </div>
            {form.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-4 gap-3 mb-2 items-end">
                <Input label={idx === 0 ? 'Product Name' : undefined} placeholder="Product name" value={item.productName} onChange={(e) => updateItem(idx, 'productName', e.target.value)} />
                <Input label={idx === 0 ? 'Quantity' : undefined} type="number" min="1" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))} />
                <Input label={idx === 0 ? 'Est. Cost' : undefined} type="number" min="0" step="0.01" value={item.estimatedCost} onChange={(e) => updateItem(idx, 'estimatedCost', Number(e.target.value))} />
                <button onClick={() => removeItem(idx)} className="p-2 hover:bg-red-50 rounded mb-1"><Trash2 className="h-4 w-4 text-red-400" /></button>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingRequisition(null); }}>Cancel</Button>
          <Button onClick={handleSave}>{editingRequisition ? 'Update' : 'Create'}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

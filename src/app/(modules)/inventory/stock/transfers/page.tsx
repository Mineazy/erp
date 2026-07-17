'use client';

import { toast, dismissToast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeftRight, Plus, Search, Edit2, Trash2, Send, CheckCircle, XCircle, Building2, Package } from 'lucide-react';

interface Branch { id: string; name: string; code: string }
interface Product { id: string; name: string; code?: string }
interface LineItem { productId: string; productName: string; quantity: number; batchNo?: string }
interface Transfer {
  id: string; transferNo: string; fromBranchId: string; toBranchId: string;
  status: string; requestedBy: string; notes: string | null;
  createdAt: string; updatedAt: string;
  fromBranch?: Branch | null; toBranch?: Branch | null;
  lines?: LineItem[];
}

const emptyForm = { fromBranchId: '', toBranchId: '', notes: '', lines: [] as LineItem[] };

const statusBadge = (status: string) => {
  const map = { draft: 'secondary', in_transit: 'warning', received: 'success', cancelled: 'destructive' };
  return <Badge variant={(map as any)[status] || 'secondary'}>{status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</Badge>;
};

export default function StockTransfersPage() {
  const [data, setData] = useState<Transfer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/inventory/stock/transfers?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json.items ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/admin/branches');
      if (res.ok) {
        const json = await res.json();
        setBranches(json.data || json);
      }
    } catch (_) {}
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/inventory/products');
      if (res.ok) {
        const json = await res.json();
        setProducts(json.items || json);
      }
    } catch (_) {}
  };

  useEffect(() => { fetchData(); }, [search, statusFilter]);
  useEffect(() => { fetchBranches(); fetchProducts(); }, []);

  const openCreate = () => {
    setEditingTransfer(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (transfer: Transfer) => {
    setEditingTransfer(transfer);
    setForm({
      fromBranchId: transfer.fromBranchId,
      toBranchId: transfer.toBranchId,
      notes: transfer.notes || '',
      lines: transfer.lines?.length ? transfer.lines.map(l => ({ ...l })) : [],
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!form.fromBranchId || !form.toBranchId) { toast('Please select From and To branches', 'error'); return; }
      if (form.fromBranchId === form.toBranchId) { toast('From and To branches must be different', 'error'); return; }
      if (!form.lines.length) { toast('At least one line item is required', 'error'); return; }
      let res; let tid;
      if (editingTransfer) {
        tid = toast('Updating transfer...', 'info', 120000);
        try {
          res = await fetch(`/api/inventory/stock/transfers/${editingTransfer.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, lines: form.lines.map(l => ({ ...l, unitPrice: 0 })) }),
          });
        } catch (e) { dismissToast(tid); throw e; }
      } else {
        tid = toast('Creating transfer...', 'info', 120000);
        try {
          res = await fetch('/api/inventory/stock/transfers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, lines: form.lines.map(l => ({ ...l, unitPrice: 0 })) }),
          });
        } catch (e) { dismissToast(tid); throw e; }
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to save', 'error');
        return;
      }
      dismissToast(tid);
      toast((editingTransfer ? 'Transfer updated' : 'Transfer created') + ' successfully', 'success');
      setDialogOpen(false);
      setEditingTransfer(null);
      fetchData();
    } catch {
      toast('Network error. Please try again.', 'error');
      return;
    }
  };

  const handleStatusAction = async (id: string, action: string) => {
    if (action === 'receive') {
      const ok = await confirmDialog({ title: 'Receive Transfer', message: 'Are you sure you want to receive this transfer? Stock quantities will be updated.', variant: 'warning' });
      if (!ok) return;
    }
    if (action === 'cancel') {
      const ok = await confirmDialog({ title: 'Cancel Transfer', message: 'Are you sure you want to cancel this transfer?', variant: 'danger' });
      if (!ok) return;
    }
    const endpoint = action === 'receive' ? 'receive' : action === 'cancel' ? 'cancel' : '';
    const method = endpoint ? 'POST' : 'PUT';
    const url = endpoint
      ? `/api/inventory/stock/transfers/${id}/${endpoint}`
      : `/api/inventory/stock/transfers/${id}`;
    const body = endpoint ? undefined : JSON.stringify({ status: 'in_transit' });

    try {
      const tid = toast(`${action === 'receive' ? 'Receiving' : action === 'cancel' ? 'Cancelling' : 'Sending'} transfer...`, 'info', 120000);
      let res;
      try {
        res = await fetch(url, { method, headers: endpoint ? undefined : { 'Content-Type': 'application/json' }, body });
      } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Operation failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed', 'error');
        return;
      }
      dismissToast(tid);
      toast(action === 'receive' ? 'Transfer received successfully' : action === 'cancel' ? 'Transfer cancelled' : 'Transfer in transit', 'success');
      fetchData();
    } catch {
      toast('Network error. Please try again.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({ title: 'Delete Transfer', message: 'Are you sure you want to delete this transfer?', variant: 'danger' });
    if (!ok) return;
    try {
      const tid = toast('Deleting transfer...', 'info', 120000);
      let res;
      try {
        res = await fetch(`/api/inventory/stock/transfers/${id}`, { method: 'DELETE' });
      } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Delete failed' }));
        dismissToast(tid);
        toast(err.error || 'Delete failed', 'error');
        return;
      }
      dismissToast(tid);
      toast('Transfer deleted', 'success');
      fetchData();
    } catch {
      toast('Network error. Please try again.', 'error');
    }
  };

  const addLine = () => {
    setForm({ ...form, lines: [...form.lines, { productId: '', productName: '', quantity: 0 }] });
  };

  const removeLine = (index: number) => {
    setForm({ ...form, lines: form.lines.filter((_, i) => i !== index) });
  };

  const updateLine = (index: number, field: string, value: string | number) => {
    const newLines = form.lines.map((l, i) => i === index ? { ...l, [field]: value } : l);
    setForm({ ...form, lines: newLines });
  };

  const handleSelectProduct = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    const brand = product ? product.name : '';
    const newLines = form.lines.map((l, i) => i === index ? { ...l, productId, productName: brand } : l);
    setForm({ ...form, lines: newLines });
  };

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Stock Transfers</h2>
          <p className="text-slate-500 mt-1">Manage stock movements between branches</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Transfer
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-mine-blue-800" />
              Transfers
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="text" placeholder="Search transfers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-64" />
              </div>
              <select
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mine-blue-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="in_transit">In Transit</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No transfers found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transfer No</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs font-medium">{t.transferNo}</TableCell>
                      <TableCell><span className="text-xs text-slate-600">{t.fromBranch?.name || '—'}</span></TableCell>
                      <TableCell><span className="text-xs text-slate-600">{t.toBranch?.name || '—'}</span></TableCell>
                      <TableCell>{statusBadge(t.status)}</TableCell>
                      <TableCell className="text-right font-mono">{t.lines?.length || 0}</TableCell>
                      <TableCell className="text-xs text-slate-600">{t.requestedBy}</TableCell>
                      <TableCell className="text-xs text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {t.status === 'draft' && (
                            <>
                              <button onClick={() => openEdit(t)} className="p-1.5 hover:bg-slate-100 rounded"><Edit2 className="h-4 w-4 text-slate-400" /></button>
                              <button onClick={() => handleStatusAction(t.id, 'send')} className="p-1.5 hover:bg-blue-50 rounded" title="Send">
                                <Send className="h-4 w-4 text-blue-500" />
                              </button>
                            </>
                          )}
                          {t.status === 'in_transit' && (
                            <button onClick={() => handleStatusAction(t.id, 'receive')} className="p-1.5 hover:bg-green-50 rounded" title="Receive">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </button>
                          )}
                          {(t.status === 'draft' || t.status === 'in_transit') && (
                            <button onClick={() => handleStatusAction(t.id, 'cancel')} className="p-1.5 hover:bg-red-50 rounded" title="Cancel">
                              <XCircle className="h-4 w-4 text-red-400" />
                            </button>
                          )}
                          {t.status === 'draft' && (
                            <button onClick={() => handleDelete(t.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-red-400" /></button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingTransfer(null); }}
        title={editingTransfer ? 'Edit Transfer' : 'New Transfer'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="From Branch"
              options={branches.map((b) => ({ value: b.id, label: `${b.code} — ${b.name}` }))}
              placeholder="Select origin branch"
              value={form.fromBranchId}
              onChange={(e) => setForm({ ...form, fromBranchId: e.target.value })}
            />
            <Select
              label="To Branch"
              options={branches.map((b) => ({ value: b.id, label: `${b.code} — ${b.name}` }))}
              placeholder="Select destination branch"
              value={form.toBranchId}
              onChange={(e) => setForm({ ...form, toBranchId: e.target.value })}
            />
          </div>
          <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Line Items</label>
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-3 w-3 mr-1" /> Add Item
              </Button>
            </div>
            {form.lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-1 gap-2 mb-2 p-2 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      label="Product"
                      placeholder="Select product"
                      options={products.map((p) => ({ value: p.id, label: p.name }))}
                      value={line.productId}
                      onChange={(e) => handleSelectProduct(idx, e.target.value)}
                    />
                  </div>
                  <div className="w-32">
                    <Input
                      label="Quantity"
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.quantity}
                      onChange={(e) => updateLine(idx, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <button onClick={() => removeLine(idx)} className="mt-5 p-1.5 hover:bg-red-50 rounded"><XCircle className="h-4 w-4 text-red-400" /></button>
                </div>
                {line.productId && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Building2 className="h-4 w-4" />
                    {line.productName}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingTransfer(null); }}>Cancel</Button>
          <Button onClick={handleSave}>{editingTransfer ? 'Update' : 'Create'} Transfer</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

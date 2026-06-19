'use client';

import { toast, dismissToast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { RotateCcw, Plus, Search, Eye, ThumbsUp, ThumbsDown, Trash2 } from 'lucide-react';

interface ReturnLine {
  id?: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  reason?: string;
  condition: string;
}

interface ReturnRecord {
  id: string;
  returnNumber: string;
  returnDate: string;
  customerName: string | null;
  referenceType: string;
  referenceId: string | null;
  reason: string | null;
  status: string;
  total: number;
  notes: string | null;
  lines: ReturnLine[];
  branch?: { id: string; code: string; name: string } | null;
}

interface Product {
  id: string;
  code: string;
  name: string;
  sellingPrice: number;
  stock: number;
}

const statusBadge: Record<string, { variant: 'warning' | 'success' | 'secondary' | 'destructive'; label: string }> = {
  pending: { variant: 'warning', label: 'Pending' },
  approved: { variant: 'secondary', label: 'Approved' },
  completed: { variant: 'success', label: 'Completed' },
  rejected: { variant: 'destructive', label: 'Rejected' },
};

export default function ReturnsPage() {
  const [data, setData] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingReturn, setViewingReturn] = useState<ReturnRecord | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [returnLines, setReturnLines] = useState<ReturnLine[]>([{ productId: '', productName: '', quantity: 1, unitPrice: 0, total: 0, condition: 'good' }]);
  const [customerName, setCustomerName] = useState('');
  const [reason, setReason] = useState('');
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/inventory/returns?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json.data?.items ?? json.items ?? []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/inventory/products');
      if (!res.ok) return;
      const json = await res.json();
      setProducts(json.items ?? json.data ?? []);
    } catch {}
  };

  useEffect(() => { fetchData(); }, [search, statusFilter]);
  useEffect(() => { if (dialogOpen) fetchProducts(); }, [dialogOpen]);

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/admin/branches');
      if (res.ok) {
        const json = await res.json();
        setBranches(json.data || json);
      }
    } catch (_) {}
  };

  useEffect(() => { fetchBranches(); }, []);

  const addLine = () => {
    setReturnLines([...returnLines, { productId: '', productName: '', quantity: 1, unitPrice: 0, total: 0, condition: 'good' }]);
  };

  const updateLine = (idx: number, field: keyof ReturnLine, value: any) => {
    const updated = returnLines.map((l, i) => {
      if (i !== idx) return l;
      const next = { ...l, [field]: value };
      if (field === 'productId') {
        const prod = products.find((p) => p.id === value);
        if (prod) {
          next.productName = prod.name;
          next.unitPrice = prod.sellingPrice;
        }
      }
      if (field === 'quantity' || field === 'unitPrice') {
        next.total = (field === 'quantity' ? parseFloat(value) || 0 : l.quantity) * (field === 'unitPrice' ? parseFloat(value) || 0 : l.unitPrice);
      }
      return next;
    });
    setReturnLines(updated);
  };

  const removeLine = (idx: number) => {
    if (returnLines.length === 1) return;
    setReturnLines(returnLines.filter((_, i) => i !== idx));
  };

  const total = returnLines.reduce((s, l) => s + l.total, 0);

  const handleCreate = async () => {
    const validLines = returnLines.filter((l) => l.productId && l.quantity > 0);
    if (validLines.length === 0) { toast('Add at least one product line', 'error'); return; }
    try {
      const tid = toast('Saving return...', 'info', 120000);
      let res;
      try {
        res = await fetch('/api/inventory/returns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: customerName || null,
            reason: reason || null,
            branchId: branchId || null,
            lines: validLines,
          }),
        });
      } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        dismissToast(tid);
        toast(err.error || 'Failed to create return', 'error');
        return;
      }
      dismissToast(tid);
      toast('Return created successfully', 'success');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch {
      toast('Network error. Please try again.', 'error');
    }
  };

  const resetForm = () => {
    setReturnLines([{ productId: '', productName: '', quantity: 1, unitPrice: 0, total: 0, condition: 'good' }]);
    setCustomerName('');
    setReason('');
    setBranchId('');
  };

  const updateStatus = async (id: string, status: string) => {
    const actionLabel = status === 'completed' ? 'approve' : status === 'rejected' ? 'reject' : 'update';
    const confirmed = await confirmDialog({
      title: `${actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1)} Return`,
      message: `Are you sure you want to ${actionLabel} this return? ${status === 'completed' ? 'Stock will be restored.' : ''}`,
      variant: status === 'rejected' ? 'danger' : 'warning',
    });
    if (!confirmed) return;
    try {
      const tid = toast(`Updating return...`, 'info', 120000);
      let res;
      try {
        res = await fetch(`/api/inventory/returns/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
      } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        dismissToast(tid);
        toast(err.error || 'Update failed', 'error');
        return;
      }
      dismissToast(tid);
      toast(`Return ${actionLabel}d successfully`, 'success');
      fetchData();
      if (viewingReturn?.id === id) setViewingReturn(null);
    } catch {
      toast('Network error', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({ title: 'Delete Return', message: 'Are you sure you want to delete this return?', variant: 'danger' });
    if (!ok) return;
    try {
      const tid = toast('Deleting return...', 'info', 120000);
      let res;
      try {
        res = await fetch(`/api/inventory/returns/${id}`, { method: 'DELETE' });
      } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        dismissToast(tid);
        toast(err.error || 'Delete failed', 'error');
        return;
      }
      dismissToast(tid);
      toast('Return deleted', 'success');
      fetchData();
    } catch {
      toast('Network error', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <RotateCcw className="h-6 w-6 text-mine-blue-800" />
            Product Returns
          </h2>
          <p className="text-slate-500 mt-1">Manage customer returns and stock restocking</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          New Return
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search returns..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-full" />
            </div>
            <Select options={[{ value: '', label: 'All Statuses' }, { value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'completed', label: 'Completed' }, { value: 'rejected', label: 'Rejected' }]} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-40" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Return #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
              ) : data.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-400">No returns found</TableCell></TableRow>
              ) : (
                data.map((r) => {
                  const badge = statusBadge[r.status] || { variant: 'secondary' as const, label: r.status };
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs font-medium">{r.returnNumber}</TableCell>
                      <TableCell className="text-xs text-slate-600">{new Date(r.returnDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm">{r.customerName || '—'}</TableCell>
                      <TableCell className="text-xs text-slate-600">{r.lines.length} item{r.lines.length !== 1 ? 's' : ''}</TableCell>
                      <TableCell className="text-xs text-slate-600">{r.branch?.name || '—'}</TableCell>
                      <TableCell className="text-right font-mono font-medium">${r.total.toFixed(2)}</TableCell>
                      <TableCell><Badge variant={badge.variant}>{badge.label}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setViewingReturn(r); setViewDialogOpen(true); }} className="p-1.5 hover:bg-slate-100 rounded"><Eye className="h-4 w-4 text-slate-400" /></button>
                          {r.status === 'pending' && (
                            <>
                              <button onClick={() => updateStatus(r.id, 'completed')} className="p-1.5 hover:bg-green-50 rounded"><ThumbsUp className="h-4 w-4 text-green-500" /></button>
                              <button onClick={() => updateStatus(r.id, 'rejected')} className="p-1.5 hover:bg-red-50 rounded"><ThumbsDown className="h-4 w-4 text-red-400" /></button>
                            </>
                          )}
                          {r.status !== 'completed' && r.status !== 'rejected' && (
                            <button onClick={() => handleDelete(r.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-red-400" /></button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Return Dialog */}
      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); resetForm(); }} title="New Return" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Optional" />
            <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Defective, Wrong item" />
          </div>
          <Select label="Branch" options={[{ value: '', label: '— No Branch —' }, ...branches.map(b => ({ value: b.id, label: b.name }))]} value={branchId} onChange={(e) => setBranchId(e.target.value)} />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Return Items</label>
              <button onClick={addLine} className="text-xs text-mine-blue-800 hover:text-mine-blue-600 flex items-center gap-1"><Plus className="h-3 w-3" /> Add Item</button>
            </div>
            {returnLines.map((l, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded border border-slate-200">
                <div className="flex-1 grid grid-cols-5 gap-2">
                  <select
                    value={l.productId}
                    onChange={(e) => updateLine(i, 'productId', e.target.value)}
                    className="col-span-2 text-sm border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-mine-blue-500"
                  >
                    <option value="">Select product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                    ))}
                  </select>
                  <input type="number" step="0.01" min="0.01" placeholder="Qty" value={l.quantity} onChange={(e) => updateLine(i, 'quantity', e.target.value)} className="text-sm border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 font-mono w-full" />
                  <input type="number" step="0.01" min="0" placeholder="Price" value={l.unitPrice} onChange={(e) => updateLine(i, 'unitPrice', e.target.value)} className="text-sm border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 font-mono w-full" />
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-mono font-medium text-slate-700">${l.total.toFixed(2)}</span>
                    {returnLines.length > 1 && (
                      <button onClick={() => removeLine(i)} className="p-1 hover:bg-red-50 rounded text-red-400"><Trash2 className="h-3 w-3" /></button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm font-semibold text-slate-900 border-t border-slate-200 pt-2">
            <span>Total</span>
            <span className="font-mono">${total.toFixed(2)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
          <Button onClick={handleCreate}>Create Return</Button>
        </DialogFooter>
      </Dialog>

      {/* View Return Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} title={viewingReturn ? `Return ${viewingReturn.returnNumber}` : ''} size="md">
        {viewingReturn && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-500">Date:</span> <span className="font-medium">{new Date(viewingReturn.returnDate).toLocaleDateString()}</span></div>
              <div><span className="text-slate-500">Customer:</span> <span className="font-medium">{viewingReturn.customerName || '—'}</span></div>
              <div><span className="text-slate-500">Reason:</span> <span className="font-medium">{viewingReturn.reason || '—'}</span></div>
              <div><span className="text-slate-500">Status:</span> <Badge variant={statusBadge[viewingReturn.status]?.variant || 'secondary'}>{statusBadge[viewingReturn.status]?.label || viewingReturn.status}</Badge></div>
              <div><span className="text-slate-500">Branch:</span> <span className="font-medium">{viewingReturn.branch?.name || '—'}</span></div>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-200"><th className="text-left py-2 text-xs font-medium text-slate-500">Product</th><th className="text-right py-2 text-xs font-medium text-slate-500">Qty</th><th className="text-right py-2 text-xs font-medium text-slate-500">Price</th><th className="text-right py-2 text-xs font-medium text-slate-500">Total</th></tr></thead>
              <tbody>
                {viewingReturn.lines.map((l, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2">{l.productName}</td>
                    <td className="py-2 text-right font-mono">{l.quantity}</td>
                    <td className="py-2 text-right font-mono">${l.unitPrice.toFixed(2)}</td>
                    <td className="py-2 text-right font-mono font-medium">${l.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="font-semibold"><td colSpan={3} className="py-2 text-right">Total</td><td className="py-2 text-right font-mono">${viewingReturn.total.toFixed(2)}</td></tr></tfoot>
            </table>
            <div className="flex gap-2">
              {viewingReturn.status === 'pending' && (
                <>
                  <Button size="sm" className="flex-1" onClick={() => { updateStatus(viewingReturn.id, 'completed'); setViewDialogOpen(false); }}>Approve & Restock</Button>
                  <Button size="sm" variant="destructive" className="flex-1" onClick={() => { updateStatus(viewingReturn.id, 'rejected'); setViewDialogOpen(false); }}>Reject</Button>
                </>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

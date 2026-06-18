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
import { Truck, Plus, Search, Eye, Send, CheckCircle, XCircle } from 'lucide-react';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierName: string;
  orderDate: string;
  expectedDate: string;
  status: string;
  total: number;
  currency: string;
  lines?: { productName: string; quantity: number; unitPrice: number; total: number }[];
}

const statusVariant: Record<string, 'default' | 'success' | 'destructive' | 'warning' | 'secondary'> = {
  draft: 'default',
  sent: 'warning',
  confirmed: 'secondary',
  received: 'success',
  cancelled: 'destructive',
};

const emptyForm = { supplierName: '', orderDate: '', expectedDate: '', notes: '' };

export default function PurchaseOrdersPage() {
  const [data, setData] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [viewPo, setViewPo] = useState<PurchaseOrder | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/inventory/purchase-orders?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json.items ?? json);
    } catch (e) {
      console.error('Failed to fetch purchase orders', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search, statusFilter]);

  const handleCreate = async () => {
    try {
      const tid = toast('Saving purchase order...', 'info', 120000);
      let res;
      try {
        res = await fetch('/api/inventory/purchase-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Create failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to create purchase order', 'error');
        return;
      }
      dismissToast(tid);
      toast('Purchase order created successfully', 'success');
      setDialogOpen(false);
      setForm(emptyForm);
      fetchData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  const handleSend = async (id: string) => {
    try {
      const res = await fetch(`/api/inventory/purchase-orders/${id}/send`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Send failed' }));
        toast(err.error || 'Failed to send order', 'error');
        return;
      }
      fetchData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  const handleCancel = async (id: string) => {
    const ok = await confirmDialog({ title: 'Cancel Purchase Order', message: 'Cancel this purchase order?', variant: 'danger' }); if (!ok) return;
    try {
      const res = await fetch(`/api/inventory/purchase-orders/${id}/cancel`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Cancel failed' }));
        toast(err.error || 'Failed to cancel order', 'error');
        return;
      }
      fetchData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  const handleReceive = async (id: string) => {
    try {
      const res = await fetch(`/api/inventory/purchase-orders/${id}/receive`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Receive failed' }));
        toast(err.error || 'Failed to receive order', 'error');
        return;
      }
      fetchData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  const openView = async (id: string) => {
    try {
      const res = await fetch(`/api/inventory/purchase-orders/${id}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const po = await res.json();
      setViewPo(po);
      setViewOpen(true);
    } catch (e) {
      console.error('Failed to fetch PO details', e);
    }
  };

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Purchase Orders</h2>
          <p className="text-slate-500 mt-1">Manage procurement and supplier orders</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          New Purchase Order
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="h-5 w-5 text-mine-blue-800" />
              Purchase Orders
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="text" placeholder="Search POs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-64" />
              </div>
              <Select options={[{ value: '', label: 'All Status' }, { value: 'draft', label: 'Draft' }, { value: 'sent', label: 'Sent' }, { value: 'confirmed', label: 'Confirmed' }, { value: 'received', label: 'Received' }, { value: 'cancelled', label: 'Cancelled' }]} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-36" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-mono text-sm font-medium">{po.poNumber}</TableCell>
                  <TableCell>{po.supplierName}</TableCell>
                  <TableCell>{po.orderDate}</TableCell>
                  <TableCell>{po.expectedDate}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">${po.total.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[po.status]}>{po.status.charAt(0).toUpperCase() + po.status.slice(1)}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openView(po.id)} className="p-1.5 hover:bg-slate-100 rounded"><Eye className="h-4 w-4 text-slate-400" /></button>
                      {po.status === 'draft' && <button onClick={() => handleSend(po.id)} className="p-1.5 hover:bg-blue-50 rounded"><Send className="h-4 w-4 text-blue-500" /></button>}
                      {po.status === 'draft' && <button onClick={() => handleCancel(po.id)} className="p-1.5 hover:bg-red-50 rounded"><XCircle className="h-4 w-4 text-red-500" /></button>}
                      {(po.status === 'sent' || po.status === 'confirmed') && <button onClick={() => handleReceive(po.id)} className="p-1.5 hover:bg-green-50 rounded"><CheckCircle className="h-4 w-4 text-green-500" /></button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="New Purchase Order" size="md">
        <div className="space-y-4">
          <Input label="Supplier Name" value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} placeholder="e.g. Equip Co" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Order Date" type="date" value={form.orderDate} onChange={(e) => setForm({ ...form, orderDate: e.target.value })} />
            <Input label="Expected Date" type="date" value={form.expectedDate} onChange={(e) => setForm({ ...form, expectedDate: e.target.value })} />
          </div>
          <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate}>Create Order</Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={viewOpen} onClose={() => { setViewOpen(false); setViewPo(null); }} title={`PO ${viewPo?.poNumber || ''}`} size="lg">
        {viewPo && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-500">PO Number</p>
                <p className="font-mono text-sm font-medium">{viewPo.poNumber}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-500">Status</p>
                <Badge variant={statusVariant[viewPo.status]}>{viewPo.status.charAt(0).toUpperCase() + viewPo.status.slice(1)}</Badge>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-500">Supplier</p>
                <p className="text-sm font-medium">{viewPo.supplierName}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-500">Order Date</p>
                <p className="text-sm">{viewPo.orderDate}</p>
              </div>
            </div>
            {viewPo.lines && viewPo.lines.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="text-left p-2 font-medium text-slate-600">Product</th>
                      <th className="text-right p-2 font-medium text-slate-600">Qty</th>
                      <th className="text-right p-2 font-medium text-slate-600">Unit Price</th>
                      <th className="text-right p-2 font-medium text-slate-600">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewPo.lines.map((line, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="p-2">{line.productName}</td>
                        <td className="text-right p-2 font-mono">{line.quantity}</td>
                        <td className="text-right p-2 font-mono">${line.unitPrice.toLocaleString()}</td>
                        <td className="text-right p-2 font-mono font-medium">${line.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold pt-2 border-t">
              <span>Total</span>
              <span className="font-mono">${viewPo.total.toLocaleString()}</span>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => { setViewOpen(false); setViewPo(null); }}>Close</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

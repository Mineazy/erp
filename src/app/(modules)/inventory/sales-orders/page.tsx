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
import { ShoppingCart, Plus, Search, Eye, CheckCircle, XCircle } from 'lucide-react';

interface SalesOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  orderDate: string;
  status: string;
  total: number;
  currency: string;
  branch?: { id: string; code: string; name: string } | null;
  lines?: { productName: string; quantity: number; unitPrice: number; total: number }[];
}

const statusVariant: Record<string, 'default' | 'success' | 'destructive' | 'warning' | 'secondary'> = {
  draft: 'default',
  confirmed: 'warning',
  processing: 'default',
  shipped: 'secondary',
  delivered: 'success',
  cancelled: 'destructive',
};

const emptyForm = { customerName: '', orderDate: '', notes: '' };

export default function SalesOrdersPage() {
  const [data, setData] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [viewSo, setViewSo] = useState<SalesOrder | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/inventory/sales-orders?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json.items ?? json);
    } catch (e) {
      console.error('Failed to fetch sales orders', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search, statusFilter]);

  const handleCreate = async () => {
    try {
      const tid = toast('Saving sales order...', 'info', 120000);
      let res;
      try {
        res = await fetch('/api/inventory/sales-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Create failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to create sales order', 'error');
        return;
      }
      dismissToast(tid);
      toast('Sales order created successfully', 'success');
      setDialogOpen(false);
      setForm(emptyForm);
      fetchData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      const res = await fetch(`/api/inventory/sales-orders/${id}/confirm`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Confirm failed' }));
        toast(err.error || 'Failed to confirm order', 'error');
        return;
      }
      fetchData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  const handleCancel = async (id: string) => {
    const ok = await confirmDialog({ title: 'Cancel Sales Order', message: 'Cancel this sales order?', variant: 'danger' }); if (!ok) return;
    try {
      const res = await fetch(`/api/inventory/sales-orders/${id}/cancel`, { method: 'POST' });
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

  const openView = async (id: string) => {
    try {
      const res = await fetch(`/api/inventory/sales-orders/${id}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(`Failed to fetch (${res.status}): ${err.error || 'Unknown'}`);
      }
      const so = await res.json();
      setViewSo(so);
      setViewOpen(true);
    } catch (e) {
      console.error('Failed to fetch SO details', e);
      toast(String(e), 'error');
    }
  };

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Sales Orders</h2>
          <p className="text-slate-500 mt-1">Manage customer orders from creation to delivery</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          New Sales Order
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-mine-blue-800" />
              Orders
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="text" placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-64" />
              </div>
              <Select options={[{ value: '', label: 'All Status' }, { value: 'draft', label: 'Draft' }, { value: 'confirmed', label: 'Confirmed' }, { value: 'processing', label: 'Processing' }, { value: 'shipped', label: 'Shipped' }, { value: 'delivered', label: 'Delivered' }, { value: 'cancelled', label: 'Cancelled' }]} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-36" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm font-medium">{order.orderNumber}</TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell>{order.orderDate}</TableCell>
                  <TableCell className="text-xs text-slate-600">{order.branch?.name || '—'}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">${order.total.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[order.status]}>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openView(order.id)} className="p-1.5 hover:bg-slate-100 rounded"><Eye className="h-4 w-4 text-slate-400" /></button>
                      {order.status === 'draft' && <button onClick={() => handleConfirm(order.id)} className="p-1.5 hover:bg-green-50 rounded"><CheckCircle className="h-4 w-4 text-green-500" /></button>}
                      {order.status === 'draft' && <button onClick={() => handleCancel(order.id)} className="p-1.5 hover:bg-red-50 rounded"><XCircle className="h-4 w-4 text-red-500" /></button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="New Sales Order" size="md">
        <div className="space-y-4">
          <Input label="Customer Name" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="e.g. ABC Corp" />
          <Input label="Order Date" type="date" value={form.orderDate} onChange={(e) => setForm({ ...form, orderDate: e.target.value })} />
          <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate}>Create Order</Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={viewOpen} onClose={() => { setViewOpen(false); setViewSo(null); }} title={`SO ${viewSo?.orderNumber || ''}`} size="lg">
        {viewSo && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-500">Order Number</p>
                <p className="font-mono text-sm font-medium">{viewSo.orderNumber}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-500">Status</p>
                <Badge variant={statusVariant[viewSo.status]}>{viewSo.status.charAt(0).toUpperCase() + viewSo.status.slice(1)}</Badge>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-500">Customer</p>
                <p className="text-sm font-medium">{viewSo.customerName}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-500">Order Date</p>
                <p className="text-sm">{viewSo.orderDate}</p>
              </div>
            </div>
            {viewSo.lines && viewSo.lines.length > 0 && (
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
                    {viewSo.lines.map((line, idx) => (
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
              <span className="font-mono">${viewSo.total.toLocaleString()}</span>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => { setViewOpen(false); setViewSo(null); }}>Close</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

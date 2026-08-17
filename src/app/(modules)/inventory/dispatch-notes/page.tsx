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
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Truck, Plus, Search, FileText, Package } from 'lucide-react';
import type { DispatchNote } from '@/types';

interface LineItem {
  productId: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  batchNo: string;
}

interface Product {
  id: string;
  name: string;
  code: string;
  sellingPrice: number;
}

const emptyLine = (): LineItem => ({
  productId: '', productName: '', quantity: '1', unitPrice: '0', batchNo: '',
});

export default function DispatchNotesPage() {
  const [data, setData] = useState<DispatchNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DispatchNote | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [dispatchDate, setDispatchDate] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);

  const [voucherOpen, setVoucherOpen] = useState(false);
  const [voucherData, setVoucherData] = useState<any>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);

  const voucherRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/inventory/dispatch-notes?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      setData(await res.json());
    } catch {
      toast('Failed to fetch dispatch notes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search, statusFilter]);

  useEffect(() => {
    fetch('/api/inventory/products?limit=200').then(async r => { if (r.ok) { const d = await r.json(); setProducts(Array.isArray(d) ? d : (d.items || [])); } }).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditing(null);
    setCustomerName(''); setDispatchDate(''); setVehicleNo(''); setDriverName('');
    setDeliveryAddress(''); setNotes(''); setLines([emptyLine()]);
    setDialogOpen(true);
  };

  const openVoucher = async (item: DispatchNote) => {
    setVoucherLoading(true);
    setVoucherOpen(true);
    try {
      const res = await fetch(`/api/inventory/dispatch-notes/${item.id}/generate`, { method: 'POST' });
      if (res.ok) setVoucherData(await res.json());
      else toast('Failed to generate dispatch note', 'error');
    } catch { toast('Network error', 'error'); }
    setVoucherLoading(false);
  };

  const handleSave = async () => {
    const nonEmpty = lines.filter(l => l.productId && l.productName);
    if (!customerName) { toast('Customer name is required', 'warning'); return; }
    if (nonEmpty.length === 0) { toast('At least one line item is required', 'warning'); return; }

    const tid = toast('Saving dispatch note...', 'info', 120000);
    try {
      const body = {
        customerName,
        dispatchDate: dispatchDate || undefined,
        vehicleNo, driverName, deliveryAddress, notes,
        lines: nonEmpty.map(l => ({
          ...l,
          quantity: parseFloat(l.quantity) || 0,
          unitPrice: parseFloat(l.unitPrice) || 0,
        })),
      };
      let res;
      if (editing) {
        res = await fetch(`/api/inventory/dispatch-notes/${editing.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
      } else {
        res = await fetch('/api/inventory/dispatch-notes', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
      }
      if (res.ok) {
        dismissToast(tid);
        toast(`Dispatch note ${editing ? 'updated' : 'created'} successfully`, 'success');
        setDialogOpen(false);
        fetchData();
      } else {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to save', 'error');
      }
    } catch {
      dismissToast(tid);
      toast('Network error', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({ title: 'Delete', message: 'Delete this dispatch note?', variant: 'danger' });
    if (!ok) return;
    const tid = toast('Deleting...', 'info', 120000);
    try {
      const res = await fetch(`/api/inventory/dispatch-notes/${id}`, { method: 'DELETE' });
      if (res.ok) { dismissToast(tid); toast('Deleted successfully', 'success'); fetchData(); }
      else { const err = await res.json().catch(() => ({ error: 'Delete failed' })); dismissToast(tid); toast(err.error || 'Failed to delete', 'error'); }
    } catch { dismissToast(tid); toast('Network error', 'error'); }
  };

  const addLine = () => setLines([...lines, emptyLine()]);
  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));
  const updateLine = (idx: number, field: keyof LineItem, value: string) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === 'productId') {
      const prod = products.find(p => p.id === value);
      if (prod) {
        updated[idx].productName = prod.name;
        if (updated[idx].unitPrice === '0') updated[idx].unitPrice = String(prod.sellingPrice || 0);
      }
    }
    setLines(updated);
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive'; label: string }> = {
      draft: { variant: 'secondary', label: 'Draft' },
      generated: { variant: 'success', label: 'Generated' },
      dispatched: { variant: 'default', label: 'Dispatched' },
      delivered: { variant: 'default', label: 'Delivered' },
      cancelled: { variant: 'destructive', label: 'Cancelled' },
    };
    const m = map[status] || { variant: 'secondary' as const, label: status };
    return <Badge variant={m.variant}>{m.label}</Badge>;
  };

  const printVoucher = () => window.print();

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dispatch Notes</h2>
          <p className="text-slate-500 mt-1">Record and generate dispatch notes for outgoing goods</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Dispatch Note
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="h-5 w-5 text-mine-blue-800" />
              Dispatch Notes
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="text" placeholder="Search dispatch notes..." value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-56" />
              </div>
              <Select options={[
                { value: '', label: 'All Status' },
                { value: 'draft', label: 'Draft' },
                { value: 'generated', label: 'Generated' },
                { value: 'dispatched', label: 'Dispatched' },
                { value: 'delivered', label: 'Delivered' },
                { value: 'cancelled', label: 'Cancelled' },
              ]} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-36" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dispatch No</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-slate-400 py-8">No dispatch notes found</TableCell>
                </TableRow>
              ) : data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs font-medium">{item.dispatchNo}</TableCell>
                  <TableCell className="text-sm">{item.customerName || '—'}</TableCell>
                  <TableCell className="text-xs">{item.lines?.length || 0} item(s)</TableCell>
                  <TableCell className="text-xs">{item.vehicleNo || '—'}</TableCell>
                  <TableCell className="text-xs">{item.driverName || '—'}</TableCell>
                  <TableCell className="text-xs">{new Date(item.dispatchDate).toLocaleDateString()}</TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openVoucher(item)} className="p-1.5 hover:bg-slate-100 rounded" title="Generate Document">
                        <FileText className="h-4 w-4 text-mine-blue-600" />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-red-50 rounded" title="Delete">
                        <Package className="h-4 w-4 text-red-400" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={editing ? 'Edit Dispatch Note' : 'New Dispatch Note'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer or delivery recipient" />
            <Input label="Dispatch Date" type="date" value={dispatchDate} onChange={(e) => setDispatchDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Vehicle No" value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} placeholder="e.g. ABC123" />
            <Input label="Driver Name" value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Driver name" />
            <Input label="Delivery Address" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Delivery address" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-slate-700">Line Items</Label>
            <Button size="sm" variant="outline" onClick={addLine}><Plus className="h-3 w-3 mr-1" />Add Item</Button>
          </div>
          {lines.map((line, idx) => (
            <div key={idx} className="grid grid-cols-5 gap-2 items-end">
              <div className="col-span-2">
                <Select label={idx === 0 ? 'Product' : ''} options={products.map(p => ({ value: p.id, label: `${p.code} - ${p.name}` }))}
                  value={line.productId} onChange={(e) => updateLine(idx, 'productId', e.target.value)} placeholder="Select..." />
              </div>
              <Input label={idx === 0 ? 'Qty' : ''} type="number" value={line.quantity} onChange={(e) => updateLine(idx, 'quantity', e.target.value)} />
              <Input label={idx === 0 ? 'Price' : ''} type="number" value={line.unitPrice} onChange={(e) => updateLine(idx, 'unitPrice', e.target.value)} />
              <div className="flex items-end gap-1">
                <Input label={idx === 0 ? 'Batch' : ''} value={line.batchNo} onChange={(e) => updateLine(idx, 'batchNo', e.target.value)} placeholder="-" />
                {lines.length > 1 && (
                  <button onClick={() => removeLine(idx)} className="p-1.5 hover:bg-red-50 rounded mb-1"><Package className="h-4 w-4 text-red-400" /></button>
                )}
              </div>
            </div>
          ))}
          <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>{editing ? 'Update' : 'Create'}</Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={voucherOpen} onClose={() => { setVoucherOpen(false); setVoucherData(null); }} title="" size="xl" className="max-w-4xl">
        {voucherLoading ? (
          <div className="p-8 text-center text-slate-500">Generating dispatch note...</div>
        ) : voucherData ? (
          <div ref={voucherRef} className="print-area p-6">
            <div className="mb-6 flex items-start gap-4">
              <img src="/logo.png" alt="Mineazy" className="h-14 w-40 object-contain flex-shrink-0" />
              <div>
                <h2 className="text-xl font-bold text-slate-900 uppercase tracking-wide">{voucherData.title}</h2>
                <p className="text-sm text-slate-500 mt-1">#{voucherData.dispatchNo}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div><span className="font-medium text-slate-600">Date:</span> {new Date(voucherData.dispatchDate).toLocaleDateString()}</div>
              <div><span className="font-medium text-slate-600">Customer:</span> {voucherData.customerName}</div>
              <div><span className="font-medium text-slate-600">Vehicle:</span> {voucherData.vehicleNo || '—'}</div>
              <div><span className="font-medium text-slate-600">Driver:</span> {voucherData.driverName || '—'}</div>
              <div className="col-span-2"><span className="font-medium text-slate-600">Delivery Address:</span> {voucherData.deliveryAddress || '—'}</div>
              <div className="col-span-2"><span className="font-medium text-slate-600">Branch:</span> {voucherData.branch || '—'}</div>
            </div>
            <Separator />
            <table className="w-full mt-4 text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800">
                  <th className="text-left py-2 font-bold uppercase text-slate-800">Items</th>
                  <th className="text-right py-2 font-bold uppercase text-slate-800">Requested Qty</th>
                  <th className="text-right py-2 font-bold uppercase text-slate-800">Dispatched Qty</th>
                  <th className="text-center py-2 font-bold uppercase text-slate-800">Security Checkbox</th>
                </tr>
              </thead>
              <tbody>
                {voucherData.lines.map((line: any, idx: number) => (
                  <tr key={idx} className="border-b border-slate-200">
                    <td className="py-3 text-slate-800 font-medium">{line.productName}</td>
                    <td className="py-3 text-right font-mono">{line.quantity}</td>
                    <td className="py-3 text-right font-mono">{line.quantity}</td>
                    <td className="py-3 text-center">
                      <div className="w-5 h-5 border-2 border-slate-400 mx-auto rounded-sm"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {voucherData.notes && (
              <p className="mt-4 text-sm text-slate-600"><span className="font-medium">Notes:</span> {voucherData.notes}</p>
            )}
            <div className="mt-8 pt-4 border-t border-slate-200 text-sm text-slate-500 flex justify-between items-center">
              <span className="flex items-center gap-1"><img src="/logo.png" alt="" className="h-8 w-auto inline object-contain" /> Mineazy ERP</span>
              <span>Generated on {new Date().toLocaleString()}</span>
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => { setVoucherOpen(false); setVoucherData(null); }}>Close</Button>
          <Button onClick={printVoucher} disabled={!voucherData}>
            <FileText className="h-4 w-4 mr-2" />
            Print
          </Button>
        </DialogFooter>
      </Dialog>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: fixed; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}

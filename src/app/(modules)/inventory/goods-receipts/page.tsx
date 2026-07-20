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
import { ClipboardCheck, Plus, Search, Eye, FileText, Package } from 'lucide-react';
import type { GoodsReceipt } from '@/types';

interface LineItem {
  productId: string;
  productName: string;
  quantity: string;
  batchNo: string;
  serialNo: string;
  location: string;
}

interface Product {
  id: string;
  name: string;
  code: string;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierName: string;
  lines: { productId: string; productName: string; quantity: number; id: string }[];
}

const emptyLine = (): LineItem => ({
  productId: '', productName: '', quantity: '1', batchNo: '', serialNo: '', location: '',
});

export default function GoodsReceiptsPage() {
  const [data, setData] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GoodsReceipt | null>(null);
  const [poId, setPoId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [receivedAt, setReceivedAt] = useState('');
  const [notes, setNotes] = useState('');
  const [inspectedBy, setInspectedBy] = useState('');
  const [inspectionStatus, setInspectionStatus] = useState('pending');
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);

  const [voucherOpen, setVoucherOpen] = useState(false);
  const [voucherData, setVoucherData] = useState<any>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [poLines, setPoLines] = useState<{ productId: string; productName: string; quantity: number; id: string }[]>([]);
  const [fetchingPO, setFetchingPO] = useState(false);

  const voucherRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/inventory/goods-receipts?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      setData(await res.json());
    } catch {
      toast('Failed to fetch goods receipts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search, statusFilter]);

  useEffect(() => {
    fetch('/api/inventory/products?limit=200').then(async r => { if (r.ok) { const d = await r.json(); setProducts(Array.isArray(d) ? d : (d.items || [])); } }).catch(() => {});
    fetch('/api/inventory/purchase-orders?status=received&limit=200').then(async r => { if (r.ok) { const d = await r.json(); setPos(Array.isArray(d) ? d : (d.items || [])); } }).catch(() => {});
  }, []);

  const handlePOBrowse = async (id: string) => {
    if (!id) { setPoLines([]); setSupplierName(''); return; }
    setFetchingPO(true);
    try {
      const res = await fetch(`/api/inventory/purchase-orders/${id}`);
      if (res.ok) {
        const po = await res.json();
        setSupplierName(po.supplierName || '');
        setPoLines(po.lines || []);
        setLines((po.lines || []).map((l: any) => ({
          productId: l.productId,
          productName: l.productName,
          quantity: String(l.quantity),
          batchNo: '', serialNo: '', location: '',
        })));
      } else {
        setPoLines([]);
        setSupplierName('');
      }
    } catch { setPoLines([]); } finally { setFetchingPO(false); }
  };

  const openCreate = () => {
    setEditing(null);
    setPoId(''); setSupplierName(''); setReceivedAt(''); setNotes('');
    setInspectedBy(''); setInspectionStatus('pending');
    setLines([emptyLine()]); setPoLines([]);
    setDialogOpen(true);
  };

  const openVoucher = async (item: GoodsReceipt) => {
    setVoucherLoading(true);
    setVoucherOpen(true);
    try {
      const res = await fetch(`/api/inventory/goods-receipts/${item.id}/generate`, { method: 'POST' });
      if (res.ok) setVoucherData(await res.json());
      else toast('Failed to generate voucher', 'error');
    } catch { toast('Network error', 'error'); }
    setVoucherLoading(false);
  };

  const handleSave = async () => {
    const nonEmpty = lines.filter(l => l.productId && l.productName);
    if (!poId) { toast('Purchase order is required', 'warning'); return; }
    if (nonEmpty.length === 0) { toast('At least one line item is required', 'warning'); return; }

    const tid = toast('Saving goods receipt...', 'info', 120000);
    try {
      const body = {
        poId,
        supplierName,
        receivedAt: receivedAt || undefined,
        notes,
        inspectedBy,
        inspectionStatus,
        lines: nonEmpty,
      };
      let res;
      if (editing) {
        res = await fetch(`/api/inventory/goods-receipts/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch('/api/inventory/goods-receipts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
      if (res.ok) {
        dismissToast(tid);
        toast(`Goods receipt ${editing ? 'updated' : 'created'} successfully`, 'success');
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
    const ok = await confirmDialog({ title: 'Delete', message: 'Delete this goods receipt?', variant: 'danger' });
    if (!ok) return;
    const tid = toast('Deleting...', 'info', 120000);
    try {
      const res = await fetch(`/api/inventory/goods-receipts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        dismissToast(tid);
        toast('Deleted successfully', 'success');
        fetchData();
      } else {
        const err = await res.json().catch(() => ({ error: 'Delete failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to delete', 'error');
      }
    } catch { dismissToast(tid); toast('Network error', 'error'); }
  };

  const addLine = () => setLines([...lines, emptyLine()]);
  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));
  const updateLine = (idx: number, field: keyof LineItem, value: string) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === 'productId') {
      const prod = products.find(p => p.id === value);
      if (prod) updated[idx].productName = prod.name;
    }
    setLines(updated);
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive'; label: string }> = {
      draft: { variant: 'secondary', label: 'Draft' },
      pending: { variant: 'warning', label: 'Pending' },
      generated: { variant: 'success', label: 'Generated' },
      completed: { variant: 'default', label: 'Completed' },
      cancelled: { variant: 'destructive', label: 'Cancelled' },
    };
    const m = map[status] || { variant: 'secondary' as const, label: status };
    return <Badge variant={m.variant}>{m.label}</Badge>;
  };

  const printVoucher = () => {
    window.print();
  };

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Goods Received Vouchers</h2>
          <p className="text-slate-500 mt-1">Record and generate vouchers for incoming goods</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New GRV
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-mine-blue-800" />
              Goods Received Vouchers
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="text" placeholder="Search GRVs..." value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-56" />
              </div>
              <Select options={[
                { value: '', label: 'All Status' },
                { value: 'draft', label: 'Draft' },
                { value: 'pending', label: 'Pending' },
                { value: 'generated', label: 'Generated' },
                { value: 'completed', label: 'Completed' },
              ]} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-36" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt No</TableHead>
                <TableHead>PO Reference</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Inspection</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-slate-400 py-8">No goods receipts found</TableCell>
                </TableRow>
              ) : data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs font-medium">{item.receiptNo}</TableCell>
                  <TableCell className="text-xs">{item.po?.poNumber || '—'}</TableCell>
                  <TableCell className="text-sm">{item.supplierName || item.po?.supplierName || '—'}</TableCell>
                  <TableCell className="text-xs">{item.lines?.length || 0} item(s)</TableCell>
                  <TableCell className="text-xs">{new Date(item.receivedAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={item.inspectionStatus === 'passed' ? 'success' : item.inspectionStatus === 'failed' ? 'destructive' : 'secondary'}>
                      {item.inspectionStatus || 'pending'}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openVoucher(item)} className="p-1.5 hover:bg-slate-100 rounded" title="Generate Voucher">
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={editing ? 'Edit GRV' : 'New Goods Received Voucher'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Purchase Order" options={pos.map(p => ({ value: p.id, label: `${p.poNumber} - ${p.supplierName}` }))}
              value={poId} onChange={(e) => { setPoId(e.target.value); handlePOBrowse(e.target.value); }}
              placeholder="Select PO..." />
            <Input label="Supplier Name" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Auto-filled from PO" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Received Date" type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} />
            <Input label="Inspected By" value={inspectedBy} onChange={(e) => setInspectedBy(e.target.value)} placeholder="Inspector name" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-slate-700">Line Items</Label>
            <Button size="sm" variant="outline" onClick={addLine}><Plus className="h-3 w-3 mr-1" />Add Item</Button>
          </div>
          {lines.map((line, idx) => (
            <div key={idx} className="grid grid-cols-6 gap-2 items-end">
              <div className="col-span-2">
                <Select label={idx === 0 ? 'Product' : ''} options={products.map(p => ({ value: p.id, label: `${p.code} - ${p.name}` }))}
                  value={line.productId} onChange={(e) => updateLine(idx, 'productId', e.target.value)} placeholder="Select..." />
              </div>
              <Input label={idx === 0 ? 'Qty' : ''} type="number" value={line.quantity} onChange={(e) => updateLine(idx, 'quantity', e.target.value)} />
              <Input label={idx === 0 ? 'Batch' : ''} value={line.batchNo} onChange={(e) => updateLine(idx, 'batchNo', e.target.value)} placeholder="-" />
              <Input label={idx === 0 ? 'Serial' : ''} value={line.serialNo} onChange={(e) => updateLine(idx, 'serialNo', e.target.value)} placeholder="-" />
              <div className="flex items-end gap-1">
                <Input label={idx === 0 ? 'Location' : ''} value={line.location} onChange={(e) => updateLine(idx, 'location', e.target.value)} placeholder="-" />
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
          <div className="p-8 text-center text-slate-500">Generating voucher...</div>
        ) : voucherData ? (
          <div ref={voucherRef} className="print-area p-6">
            <div className="mb-6 flex items-start gap-4">
              <img src="/logo.PNG" alt="Mineazy" className="h-32 w-32 object-contain flex-shrink-0" />
              <div>
                <h2 className="text-xl font-bold text-slate-900 uppercase tracking-wide">{voucherData.title}</h2>
                <p className="text-sm text-slate-500 mt-1">#{voucherData.receiptNo}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div><span className="font-medium text-slate-600">Date:</span> {new Date(voucherData.receiptDate).toLocaleDateString()}</div>
              <div><span className="font-medium text-slate-600">PO Number:</span> {voucherData.poNumber}</div>
              <div><span className="font-medium text-slate-600">Supplier:</span> {voucherData.supplierName}</div>
              <div><span className="font-medium text-slate-600">Branch:</span> {voucherData.branch || '—'}</div>
              <div><span className="font-medium text-slate-600">Inspected By:</span> {voucherData.inspectedBy || '—'}</div>
              <div><span className="font-medium text-slate-600">Inspection:</span> {voucherData.inspectionStatus}</div>
            </div>
            <Separator />
            <table className="w-full mt-4 text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 font-medium text-slate-600">#</th>
                  <th className="text-left py-2 font-medium text-slate-600">Product</th>
                  <th className="text-right py-2 font-medium text-slate-600">Quantity</th>
                  <th className="text-center py-2 font-medium text-slate-600">Batch</th>
                  <th className="text-center py-2 font-medium text-slate-600">Serial</th>
                  <th className="text-center py-2 font-medium text-slate-600">Location</th>
                </tr>
              </thead>
              <tbody>
                {voucherData.lines.map((line: any, idx: number) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="py-2 text-slate-500">{idx + 1}</td>
                    <td className="py-2">{line.productName}</td>
                    <td className="py-2 text-right font-mono">{line.quantity}</td>
                    <td className="py-2 text-center text-xs">{line.batchNo || '—'}</td>
                    <td className="py-2 text-center text-xs">{line.serialNo || '—'}</td>
                    <td className="py-2 text-center text-xs">{line.location || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {voucherData.notes && (
              <p className="mt-4 text-sm text-slate-600"><span className="font-medium">Notes:</span> {voucherData.notes}</p>
            )}
            <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between text-xs text-slate-400">
              <span>Generated: {new Date(voucherData.generatedAt).toLocaleString()}</span>
              <span className="flex items-center gap-1"><img src="/logo.PNG" alt="" className="h-8 w-8 inline object-contain" /> Mineazy ERP</span>
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

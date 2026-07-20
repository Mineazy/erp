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
import { ArrowLeftRight, Plus, Search, Edit2, Trash2, Package, Warehouse, FileText } from 'lucide-react';

interface VoucherData {
  title: string;
  movementNo: string;
  type: string;
  productName: string;
  quantity: number;
  fromWarehouse: string;
  toWarehouse: string;
  referenceType: string;
  referenceId: string;
  notes: string;
  requestedBy: string;
  branch: string;
  createdAt: string;
  generatedAt: string;
}

interface Movement {
  id: string;
  movementNo: string;
  type: string;
  productName: string;
  quantity: number;
  fromWarehouseId: string;
  toWarehouseId: string;
  fromWarehouse?: { id: string; name: string };
  toWarehouse?: { id: string; name: string };
  branch?: { id: string; code: string; name: string } | null;
  createdAt: string;
}

interface WarehouseItem {
  id: string;
  name: string;
}

const emptyForm = { type: 'inbound', productName: '', quantity: 0, fromWarehouseId: '', toWarehouseId: '' };

const typeBadgeVariant: Record<string, 'success' | 'destructive' | 'default'> = {
  inbound: 'success',
  outbound: 'destructive',
  transfer: 'default',
};

const typeLabels: Record<string, string> = {
  inbound: 'Inbound',
  outbound: 'Outbound',
  transfer: 'Transfer',
};

export default function MovementsPage() {
  const [data, setData] = useState<Movement[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [voucherData, setVoucherData] = useState<VoucherData | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/warehouse/movements?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch movements', e);
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

  const getWarehouseName = (id: string) => {
    const w = warehouses.find((w) => w.id === id);
    return w ? w.name : id;
  };

  const openCreate = () => {
    setEditingMovement(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (movement: Movement) => {
    setEditingMovement(movement);
    setForm({ type: movement.type, productName: movement.productName, quantity: movement.quantity, fromWarehouseId: movement.fromWarehouseId || '', toWarehouseId: movement.toWarehouseId || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      let res;
      let tid;
      if (editingMovement) {
        tid = toast('Updating movement...', 'info', 120000);
        try {
          res = await fetch(`/api/warehouse/movements/${editingMovement.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });
        } catch (e) { dismissToast(tid); throw e; }
      } else {
        tid = toast('Saving movement...', 'info', 120000);
        try {
          res = await fetch('/api/warehouse/movements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });
        } catch (e) { dismissToast(tid); throw e; }
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to save movement', 'error');
        return;
      }
      dismissToast(tid);
      toast((editingMovement ? 'Movement updated' : 'Movement created') + ' successfully', 'success');
      setDialogOpen(false);
      setEditingMovement(null);
      fetchData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  const openVoucher = async (movement: Movement) => {
    setVoucherLoading(true);
    setVoucherOpen(true);
    try {
      const res = await fetch(`/api/warehouse/movements/${movement.id}/voucher`);
      if (res.ok) setVoucherData(await res.json());
      else toast('Failed to generate voucher', 'error');
    } catch {
      toast('Network error', 'error');
    }
    setVoucherLoading(false);
  };

  const printVoucher = () => window.print();

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({ title: 'Delete Movement', message: 'Are you sure you want to delete this movement?', variant: 'danger' }); if (!ok) return;
    try {
      const tid = toast('Deleting movement...', 'info', 120000);
      let res;
      try {
        res = await fetch(`/api/warehouse/movements/${id}`, { method: 'DELETE' });
      } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Delete failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to delete movement', 'error');
        return;
      }
      dismissToast(tid);
      toast('Movement deleted successfully', 'success');
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
          <h2 className="text-2xl font-bold text-slate-900">Stock Movements</h2>
          <p className="text-slate-500 mt-1">Track inventory movements across warehouses</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Movement
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Total Movements</p>
            <p className="text-xl font-bold text-slate-900">{data.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Inbound</p>
            <p className="text-xl font-bold text-green-600">{data.filter(m => m.type === 'inbound').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Outbound</p>
            <p className="text-xl font-bold text-red-600">{data.filter(m => m.type === 'outbound').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Transfers</p>
            <p className="text-xl font-bold text-blue-600">{data.filter(m => m.type === 'transfer').length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-mine-blue-800" />
              Movement List
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search movements..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Movement No</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>From Warehouse</TableHead>
                <TableHead>To Warehouse</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell className="font-mono text-xs">{movement.movementNo}</TableCell>
                  <TableCell>
                    <Badge variant={typeBadgeVariant[movement.type] || 'secondary'}>
                      {typeLabels[movement.type] || movement.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{movement.productName}</TableCell>
                  <TableCell className="text-right font-mono">{movement.quantity}</TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {movement.fromWarehouse?.name || getWarehouseName(movement.fromWarehouseId) || '-'}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {movement.toWarehouse?.name || getWarehouseName(movement.toWarehouseId) || '-'}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">{movement.branch?.name || '—'}</TableCell>
                  <TableCell className="text-xs text-slate-600">{new Date(movement.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openVoucher(movement)} className="p-1.5 hover:bg-slate-100 rounded" title="Generate Voucher"><FileText className="h-4 w-4 text-mine-blue-600" /></button>
                      <button onClick={() => openEdit(movement)} className="p-1.5 hover:bg-slate-100 rounded"><Edit2 className="h-4 w-4 text-slate-400" /></button>
                      <button onClick={() => handleDelete(movement.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-red-400" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditingMovement(null); }} title={editingMovement ? 'Edit Movement' : 'Add Movement'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Movement Type" options={[
              { value: 'inbound', label: 'Inbound' },
              { value: 'outbound', label: 'Outbound' },
              { value: 'transfer', label: 'Transfer' },
            ]} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
            <Input label="Product Name" value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} placeholder="e.g. Copper Ore" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Quantity" type="number" value={form.quantity.toString()} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} />
          </div>
          {(form.type === 'outbound' || form.type === 'transfer') && (
            <Select label="From Warehouse" options={warehouseOptions} value={form.fromWarehouseId} onChange={(e) => setForm({ ...form, fromWarehouseId: e.target.value })} placeholder="Select warehouse" />
          )}
          {(form.type === 'inbound' || form.type === 'transfer') && (
            <Select label="To Warehouse" options={warehouseOptions} value={form.toWarehouseId} onChange={(e) => setForm({ ...form, toWarehouseId: e.target.value })} placeholder="Select warehouse" />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingMovement(null); }}>Cancel</Button>
          <Button onClick={handleSave}>{editingMovement ? 'Update' : 'Create'}</Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={voucherOpen} onClose={() => { setVoucherOpen(false); setVoucherData(null); }} title="" size="xl" className="max-w-4xl">
        {voucherLoading ? (
          <div className="p-8 text-center text-slate-500">Generating voucher...</div>
        ) : voucherData ? (
          <div className="print-area p-6">
            <div className="mb-6 flex items-start gap-4">
              <img src="/logo.PNG" alt="Mineazy" className="h-32 w-32 object-contain flex-shrink-0" />
              <div>
                <h2 className="text-xl font-bold text-slate-900 uppercase tracking-wide">{voucherData.title}</h2>
                <p className="text-sm text-slate-500 mt-1">#{voucherData.movementNo}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div><span className="font-medium text-slate-600">Date:</span> {new Date(voucherData.createdAt).toLocaleDateString()}</div>
              <div><span className="font-medium text-slate-600">Type:</span> {voucherData.type}</div>
              <div><span className="font-medium text-slate-600">Product:</span> {voucherData.productName}</div>
              <div><span className="font-medium text-slate-600">Quantity:</span> {voucherData.quantity}</div>
              <div><span className="font-medium text-slate-600">From:</span> {voucherData.fromWarehouse}</div>
              <div><span className="font-medium text-slate-600">To:</span> {voucherData.toWarehouse}</div>
              <div><span className="font-medium text-slate-600">Requested By:</span> {voucherData.requestedBy || '—'}</div>
              <div><span className="font-medium text-slate-600">Branch:</span> {voucherData.branch || '—'}</div>
              {voucherData.referenceType && <div className="col-span-2"><span className="font-medium text-slate-600">Reference:</span> {voucherData.referenceType} #{voucherData.referenceId}</div>}
            </div>
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

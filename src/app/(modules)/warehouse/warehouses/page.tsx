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
import { Warehouse, Plus, Search, Edit2, Trash2, MapPin, Package } from 'lucide-react';

interface WarehouseItem {
  id: string;
  code: string;
  name: string;
  location: string;
  type: string;
  isActive: boolean;
}

const emptyForm = { code: '', name: '', location: '', type: 'standard', isActive: true };

const typeLabels: Record<string, string> = {
  standard: 'Standard',
  cold_storage: 'Cold Storage',
  hazardous: 'Hazardous',
  mining: 'Mining',
};

export default function WarehousesPage() {
  const [data, setData] = useState<WarehouseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseItem | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/warehouse?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch warehouses', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search]);

  const openCreate = () => {
    setEditingWarehouse(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (warehouse: WarehouseItem) => {
    setEditingWarehouse(warehouse);
    setForm({ code: warehouse.code, name: warehouse.name, location: warehouse.location, type: warehouse.type, isActive: warehouse.isActive });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      let res;
      let tid;
      if (editingWarehouse) {
        tid = toast('Updating warehouse...', 'info', 120000);
        try {
          res = await fetch(`/api/warehouse/${editingWarehouse.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });
        } catch (e) { dismissToast(tid); throw e; }
      } else {
        tid = toast('Saving warehouse...', 'info', 120000);
        try {
          res = await fetch('/api/warehouse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });
        } catch (e) { dismissToast(tid); throw e; }
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to save warehouse', 'error');
        return;
      }
      dismissToast(tid);
      toast((editingWarehouse ? 'Warehouse updated' : 'Warehouse created') + ' successfully', 'success');
      setDialogOpen(false);
      setEditingWarehouse(null);
      fetchData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({ title: 'Delete Warehouse', message: 'Are you sure you want to delete this warehouse?', variant: 'danger' }); if (!ok) return;
    try {
      const tid = toast('Deleting warehouse...', 'info', 120000);
      let res;
      try {
        res = await fetch(`/api/warehouse/${id}`, { method: 'DELETE' });
      } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Delete failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to delete warehouse', 'error');
        return;
      }
      dismissToast(tid);
      toast('Warehouse deleted successfully', 'success');
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
          <h2 className="text-2xl font-bold text-slate-900">Warehouses</h2>
          <p className="text-slate-500 mt-1">Manage your warehouse locations</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Warehouse
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Total Warehouses</p>
            <p className="text-xl font-bold text-slate-900">{data.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Active</p>
            <p className="text-xl font-bold text-green-600">{data.filter(w => w.isActive).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Inactive</p>
            <p className="text-xl font-bold text-red-600">{data.filter(w => !w.isActive).length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-mine-blue-800" />
              Warehouse List
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search warehouses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((warehouse) => (
                <TableRow key={warehouse.id} className={!warehouse.isActive ? 'opacity-60' : ''}>
                  <TableCell className="font-mono text-xs">{warehouse.code}</TableCell>
                  <TableCell className="font-medium">{warehouse.name}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-xs text-slate-600"><MapPin className="h-3 w-3" />{warehouse.location}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{typeLabels[warehouse.type] || warehouse.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={warehouse.isActive ? 'success' : 'secondary'}>
                      {warehouse.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(warehouse)} className="p-1.5 hover:bg-slate-100 rounded"><Edit2 className="h-4 w-4 text-slate-400" /></button>
                      <button onClick={() => handleDelete(warehouse.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-red-400" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditingWarehouse(null); }} title={editingWarehouse ? 'Edit Warehouse' : 'Add Warehouse'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Warehouse Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. WH-001" />
            <Input label="Warehouse Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Main Warehouse" />
          </div>
          <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. 123 Industrial Rd" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Type" options={[
              { value: 'standard', label: 'Standard' },
              { value: 'cold_storage', label: 'Cold Storage' },
              { value: 'hazardous', label: 'Hazardous' },
              { value: 'mining', label: 'Mining' },
            ]} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-mine-blue-800 focus:ring-mine-blue-500" />
              <label htmlFor="isActive" className="text-sm text-slate-700">Active</label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingWarehouse(null); }}>Cancel</Button>
          <Button onClick={handleSave}>{editingWarehouse ? 'Update' : 'Create'}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

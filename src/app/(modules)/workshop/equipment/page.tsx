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
import { Wrench, Plus, Search, Edit2, Trash2 } from 'lucide-react';

interface Equipment {
  id: string;
  code: string;
  name: string;
  type: string;
  model: string;
  manufacturer: string;
  serialNo: string;
  location: string;
  purchaseDate: string;
  purchaseCost: number;
  status: string;
}

const emptyForm = {
  code: '', name: '', type: 'crusher', model: '', manufacturer: '',
  serialNo: '', location: '', purchaseDate: '', purchaseCost: '', status: 'operational',
};

export default function EquipmentPage() {
  const [data, setData] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/workshop/equipment?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch equipment', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search]);

  const openCreate = () => {
    setEditingEquipment(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (equipment: Equipment) => {
    setEditingEquipment(equipment);
    setForm({
      code: equipment.code,
      name: equipment.name,
      type: equipment.type,
      model: equipment.model,
      manufacturer: equipment.manufacturer,
      serialNo: equipment.serialNo,
      location: equipment.location,
      purchaseDate: equipment.purchaseDate ? equipment.purchaseDate.split('T')[0] : '',
      purchaseCost: equipment.purchaseCost.toString(),
      status: equipment.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = { ...form, purchaseCost: parseFloat(form.purchaseCost) || 0 };
      let res;
      let tid;
      if (editingEquipment) {
        tid = toast('Updating equipment...', 'info', 120000);
        try {
          res = await fetch(`/api/workshop/equipment/${editingEquipment.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } catch (e) { dismissToast(tid); throw e; }
      } else {
        tid = toast('Saving equipment...', 'info', 120000);
        try {
          res = await fetch('/api/workshop/equipment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } catch (e) { dismissToast(tid); throw e; }
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to save equipment', 'error');
        return;
      }
      dismissToast(tid);
      toast((editingEquipment ? 'Equipment updated' : 'Equipment created') + ' successfully', 'success');
      setDialogOpen(false);
      setEditingEquipment(null);
      fetchData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({ title: 'Delete Equipment', message: 'Are you sure you want to delete this equipment?', variant: 'danger' }); if (!ok) return;
    try {
      const tid = toast('Deleting equipment...', 'info', 120000);
      let res;
      try {
        res = await fetch(`/api/workshop/equipment/${id}`, { method: 'DELETE' });
      } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Delete failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to delete equipment', 'error');
        return;
      }
      dismissToast(tid);
      toast('Equipment deleted successfully', 'success');
      fetchData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case 'operational': return 'success' as const;
      case 'under_maintenance': return 'warning' as const;
      case 'broken_down': return 'destructive' as const;
      default: return 'default' as const;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'operational': return 'Operational';
      case 'under_maintenance': return 'Under Maintenance';
      case 'broken_down': return 'Broken Down';
      default: return status;
    }
  };

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Equipment</h2>
          <p className="text-slate-500 mt-1">Manage workshop equipment and machinery</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Equipment
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Total Equipment</p>
            <p className="text-xl font-bold text-slate-900">{data.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Operational</p>
            <p className="text-xl font-bold text-green-600">{data.filter(e => e.status === 'operational').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Under Maintenance</p>
            <p className="text-xl font-bold text-amber-600">{data.filter(e => e.status === 'under_maintenance').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Broken Down</p>
            <p className="text-xl font-bold text-red-600">{data.filter(e => e.status === 'broken_down').length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wrench className="h-5 w-5 text-mine-blue-800" />
              Equipment List
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search equipment..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((equipment) => (
                <TableRow key={equipment.id}>
                  <TableCell className="font-mono text-xs">{equipment.code}</TableCell>
                  <TableCell className="font-medium">{equipment.name}</TableCell>
                  <TableCell className="text-xs text-slate-600 capitalize">{equipment.type}</TableCell>
                  <TableCell className="text-xs text-slate-600">{equipment.model}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(equipment.status)}>{statusLabel(equipment.status)}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">{equipment.location}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(equipment)} className="p-1.5 hover:bg-slate-100 rounded"><Edit2 className="h-4 w-4 text-slate-400" /></button>
                      <button onClick={() => handleDelete(equipment.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-red-400" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditingEquipment(null); }} title={editingEquipment ? 'Edit Equipment' : 'Add Equipment'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Equipment Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. CR-001" />
            <Input label="Equipment Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Jaw Crusher" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Type" options={[
              { value: 'crusher', label: 'Crusher' },
              { value: 'mill', label: 'Mill' },
              { value: 'conveyor', label: 'Conveyor' },
              { value: 'loader', label: 'Loader' },
              { value: 'excavator', label: 'Excavator' },
              { value: 'drill', label: 'Drill' },
              { value: 'pump', label: 'Pump' },
              { value: 'generator', label: 'Generator' },
            ]} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
            <Input label="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="e.g. C120" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Manufacturer" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} placeholder="e.g. Metso" />
            <Input label="Serial No." value={form.serialNo} onChange={(e) => setForm({ ...form, serialNo: e.target.value })} placeholder="Serial number" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Plant A" />
            <Input label="Purchase Date" type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Purchase Cost" type="number" step="0.01" value={form.purchaseCost} onChange={(e) => setForm({ ...form, purchaseCost: e.target.value })} placeholder="e.g. 500000" />
            <Select label="Status" options={[
              { value: 'operational', label: 'Operational' },
              { value: 'under_maintenance', label: 'Under Maintenance' },
              { value: 'broken_down', label: 'Broken Down' },
            ]} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingEquipment(null); }}>Cancel</Button>
          <Button onClick={handleSave}>{editingEquipment ? 'Update' : 'Create'}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

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
import { ClipboardList, Plus, Search, Edit2, Trash2 } from 'lucide-react';

interface WorkOrder {
  id: string;
  woNumber: string;
  equipmentId: string;
  equipment?: { name: string; code: string };
  type: string;
  priority: string;
  status: string;
  assignedTo: string;
  scheduledDate: string;
  description: string;
}

interface EquipmentOption {
  id: string;
  name: string;
  code: string;
}

const emptyForm = {
  equipmentId: '', type: 'preventive', priority: 'medium',
  description: '', assignedTo: '', scheduledDate: '',
};

export default function WorkOrdersPage() {
  const [data, setData] = useState<WorkOrder[]>([]);
  const [equipmentList, setEquipmentList] = useState<EquipmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/workshop/work-orders?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch work orders', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchEquipment = async () => {
    try {
      const res = await fetch('/api/workshop/equipment?limit=500');
      if (res.ok) {
        const json = await res.json();
        setEquipmentList(json);
      }
    } catch (e) {
      console.error('Failed to fetch equipment', e);
    }
  };

  useEffect(() => { fetchData(); }, [search]);
  useEffect(() => { fetchEquipment(); }, []);

  const openCreate = () => {
    setEditingOrder(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (order: WorkOrder) => {
    setEditingOrder(order);
    setForm({
      equipmentId: order.equipmentId,
      type: order.type,
      priority: order.priority,
      description: order.description,
      assignedTo: order.assignedTo,
      scheduledDate: order.scheduledDate ? order.scheduledDate.split('T')[0] : '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      let res;
      let tid;
      if (editingOrder) {
        tid = toast('Updating work order...', 'info', 120000);
        try {
          res = await fetch(`/api/workshop/work-orders/${editingOrder.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });
        } catch (e) { dismissToast(tid); throw e; }
      } else {
        tid = toast('Saving work order...', 'info', 120000);
        try {
          res = await fetch('/api/workshop/work-orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });
        } catch (e) { dismissToast(tid); throw e; }
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to save work order', 'error');
        return;
      }
      dismissToast(tid);
      toast((editingOrder ? 'Work order updated' : 'Work order created') + ' successfully', 'success');
      setDialogOpen(false);
      setEditingOrder(null);
      fetchData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({ title: 'Delete Work Order', message: 'Are you sure you want to delete this work order?', variant: 'danger' }); if (!ok) return;
    try {
      const tid = toast('Deleting work order...', 'info', 120000);
      let res;
      try {
        res = await fetch(`/api/workshop/work-orders/${id}`, { method: 'DELETE' });
      } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Delete failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to delete work order', 'error');
        return;
      }
      dismissToast(tid);
      toast('Work order deleted successfully', 'success');
      fetchData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case 'open': return 'secondary' as const;
      case 'in_progress': return 'warning' as const;
      case 'completed': return 'success' as const;
      default: return 'default' as const;
    }
  };

  const priorityVariant = (priority: string) => {
    switch (priority) {
      case 'low': return 'secondary' as const;
      case 'medium': return 'warning' as const;
      case 'high': return 'destructive' as const;
      case 'critical': return 'destructive' as const;
      default: return 'default' as const;
    }
  };

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Work Orders</h2>
          <p className="text-slate-500 mt-1">Manage maintenance work orders</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Work Order
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Total Orders</p>
            <p className="text-xl font-bold text-slate-900">{data.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Open</p>
            <p className="text-xl font-bold text-slate-600">{data.filter(o => o.status === 'open').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">In Progress</p>
            <p className="text-xl font-bold text-amber-600">{data.filter(o => o.status === 'in_progress').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Completed</p>
            <p className="text-xl font-bold text-green-600">{data.filter(o => o.status === 'completed').length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-mine-blue-800" />
              Work Orders List
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search work orders..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>WO Number</TableHead>
                <TableHead>Equipment</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs font-medium">{order.woNumber}</TableCell>
                  <TableCell className="text-sm">{order.equipment?.name || order.equipment?.code || '—'}</TableCell>
                  <TableCell className="text-xs text-slate-600 capitalize">{order.type}</TableCell>
                  <TableCell>
                    <Badge variant={priorityVariant(order.priority)}>{order.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(order.status)}>{order.status.replace(/_/g, ' ')}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">{order.assignedTo}</TableCell>
                  <TableCell className="text-xs">{order.scheduledDate ? new Date(order.scheduledDate).toLocaleDateString() : '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(order)} className="p-1.5 hover:bg-slate-100 rounded"><Edit2 className="h-4 w-4 text-slate-400" /></button>
                      <button onClick={() => handleDelete(order.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-red-400" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditingOrder(null); }} title={editingOrder ? 'Edit Work Order' : 'New Work Order'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Equipment" options={equipmentList.map(e => ({ value: e.id, label: `${e.code} - ${e.name}` }))} value={form.equipmentId} onChange={(e) => setForm({ ...form, equipmentId: e.target.value })} />
            <Select label="Type" options={[
              { value: 'preventive', label: 'Preventive' },
              { value: 'corrective', label: 'Corrective' },
              { value: 'emergency', label: 'Emergency' },
            ]} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Priority" options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'critical', label: 'Critical' },
            ]} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
            <Input label="Assigned To" value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} placeholder="Technician name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Scheduled Date" type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 gap-4">
            <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the work required" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingOrder(null); }}>Cancel</Button>
          <Button onClick={handleSave}>{editingOrder ? 'Update' : 'Create'}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

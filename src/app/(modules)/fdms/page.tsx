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
import { Printer, Plus, Search, Edit2, Trash2, Monitor, CheckCircle, AlertTriangle } from 'lucide-react';

interface FdmsDevice {
  id: string;
  deviceId: string;
  serialNo: string;
  status: string;
  fiscalDayNo: number;
  receiptCounter: number;
  lastSyncAt: string;
  activationKey: string;
  branch?: { id: string; code: string; name: string } | null;
}

const emptyForm = { deviceId: '', serialNo: '', activationKey: '', status: 'active', branchId: '' };

export default function FdmsPage() {
  const [data, setData] = useState<FdmsDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<FdmsDevice | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [branches, setBranches] = useState<{ id: string; code: string; name: string }[]>([]);

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

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/fdms/devices?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch FDMS devices', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search]);

  const openCreate = () => {
    setEditingDevice(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (device: FdmsDevice) => {
    setEditingDevice(device);
    setForm({ deviceId: device.deviceId, serialNo: device.serialNo, activationKey: device.activationKey, status: device.status, branchId: device.branch?.id || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      let res;
      let tid;
      if (editingDevice) {
        tid = toast('Updating device...', 'info', 120000);
        try {
          res = await fetch(`/api/fdms/devices/${editingDevice.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });
        } catch (e) { dismissToast(tid); throw e; }
      } else {
        tid = toast('Saving device...', 'info', 120000);
        try {
          res = await fetch('/api/fdms/devices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });
        } catch (e) { dismissToast(tid); throw e; }
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to save device', 'error');
        return;
      }
      dismissToast(tid);
      toast((editingDevice ? 'Device updated' : 'Device created') + ' successfully', 'success');
      setDialogOpen(false);
      setEditingDevice(null);
      fetchData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({ title: 'Unregister Device', message: 'Are you sure you want to unregister this device?', variant: 'danger' }); if (!ok) return;
    try {
      const tid = toast('Deleting device...', 'info', 120000);
      let res;
      try {
        res = await fetch(`/api/fdms/devices/${id}`, { method: 'DELETE' });
      } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Delete failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to delete device', 'error');
        return;
      }
      dismissToast(tid);
      toast('Device deleted successfully', 'success');
      fetchData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  const statusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'secondary' | 'destructive' | 'warning'> = {
      active: 'success',
      inactive: 'secondary',
      suspended: 'destructive',
      pending: 'warning',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">FDMS Fiscalisation</h2>
          <p className="text-slate-500 mt-1">Manage fiscal devices</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Register Device
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Total Devices</p>
            <p className="text-xl font-bold text-slate-900">{data.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Active</p>
            <p className="text-xl font-bold text-green-600">{data.filter(d => d.status === 'active').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Registered</p>
            <p className="text-xl font-bold text-mine-blue-800">{data.filter(d => d.status !== 'inactive').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Total Receipts</p>
            <p className="text-xl font-bold text-amber-600">{data.reduce((s, d) => s + d.receiptCounter, 0).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Printer className="h-5 w-5 text-mine-blue-800" />
              Fiscal Devices
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search devices..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device ID</TableHead>
                <TableHead>Serial No</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead className="text-right">Fiscal Day</TableHead>
                <TableHead className="text-right">Receipts</TableHead>
                <TableHead>Last Sync</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((device) => (
                <TableRow key={device.id}>
                  <TableCell className="font-mono text-xs">{device.deviceId}</TableCell>
                  <TableCell className="font-mono text-xs">{device.serialNo}</TableCell>
                  <TableCell>{statusBadge(device.status)}</TableCell>
                  <TableCell className="text-xs text-slate-600">{device.branch?.name || '—'}</TableCell>
                  <TableCell className="text-right font-mono">{device.fiscalDayNo}</TableCell>
                  <TableCell className="text-right font-mono">{device.receiptCounter.toLocaleString()}</TableCell>
                  <TableCell className="text-xs text-slate-600">{device.lastSyncAt ? new Date(device.lastSyncAt).toLocaleString() : '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(device)} className="p-1.5 hover:bg-slate-100 rounded"><Edit2 className="h-4 w-4 text-slate-400" /></button>
                      <button onClick={() => handleDelete(device.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-red-400" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditingDevice(null); }} title={editingDevice ? 'Edit Device' : 'Register Device'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Device ID" value={form.deviceId} onChange={(e) => setForm({ ...form, deviceId: e.target.value })} placeholder="e.g. FDMS-001" />
            <Input label="Serial No" value={form.serialNo} onChange={(e) => setForm({ ...form, serialNo: e.target.value })} placeholder="e.g. SN-12345" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Activation Key" value={form.activationKey} onChange={(e) => setForm({ ...form, activationKey: e.target.value })} placeholder="Activation key" />
            <Select label="Status" options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'suspended', label: 'Suspended' }, { value: 'pending', label: 'Pending' }]} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Branch" options={[{ value: '', label: '— No Branch —' }, ...branches.map(b => ({ value: b.id, label: b.name }))]} value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingDevice(null); }}>Cancel</Button>
          <Button onClick={handleSave}>{editingDevice ? 'Update' : 'Register'}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

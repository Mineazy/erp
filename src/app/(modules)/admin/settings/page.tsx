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
import { Settings, Plus, Search, Edit2, Trash2, RefreshCw, Save, Download, LayoutGrid, CloudDownload, FileText } from 'lucide-react';

interface Setting {
  id: string;
  key: string;
  value: string;
  category: string;
  description: string;
}

const categories = [
  { value: 'general', label: 'General' },
  { value: 'tax', label: 'Tax' },
  { value: 'fiscalisation', label: 'Fiscalisation' },
  { value: 'email', label: 'Email' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'payment', label: 'Payment' },
  { value: 'security', label: 'Security' },
];

const emptyForm = { key: '', value: '', category: 'general', description: '' };

export default function SettingsPage() {
  const [data, setData] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<Setting | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/settings?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch settings', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search]);

  const openCreate = () => {
    setEditingSetting(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (setting: Setting) => {
    setEditingSetting(setting);
    setForm({ key: setting.key, value: setting.value, category: setting.category, description: setting.description });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      let res;
      let tid;
      if (editingSetting) {
        tid = toast('Updating setting...', 'info', 120000);
        try {
          res = await fetch(`/api/admin/settings/${editingSetting.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });
        } catch (e) { dismissToast(tid); throw e; }
      } else {
        tid = toast('Saving setting...', 'info', 120000);
        try {
          res = await fetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });
        } catch (e) { dismissToast(tid); throw e; }
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to save setting', 'error');
        return;
      }
      dismissToast(tid);
      toast((editingSetting ? 'Setting updated' : 'Setting created') + ' successfully', 'success');
      setDialogOpen(false);
      setEditingSetting(null);
      fetchData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({ title: 'Delete Setting', message: 'Are you sure you want to delete this setting?', variant: 'danger' }); if (!ok) return;
    try {
      const tid = toast('Deleting setting...', 'info', 120000);
      let res;
      try {
        res = await fetch(`/api/admin/settings/${id}`, { method: 'DELETE' });
      } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Delete failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to delete setting', 'error');
        return;
      }
      dismissToast(tid);
      toast('Setting deleted successfully', 'success');
      fetchData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  const truncateValue = (val: string, max = 60) => {
    if (val.length <= max) return val;
    return val.substring(0, max) + '...';
  };

  const categoryCounts = data.reduce((acc: Record<string, number>, s) => {
    acc[s.category] = (acc[s.category] || 0) + 1;
    return acc;
  }, {});

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">System Settings</h2>
          <p className="text-slate-500 mt-1">Configure system parameters</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Setting
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Total Settings</p>
            <p className="text-xl font-bold text-slate-900">{data.length}</p>
          </CardContent>
        </Card>
        {Object.entries(categoryCounts).slice(0, 3).map(([cat, count]) => (
          <Card key={cat}>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500 capitalize">{cat}</p>
              <p className="text-xl font-bold text-mine-blue-800">{count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5 text-mine-blue-800" />
              Settings
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search settings..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((setting) => (
                <TableRow key={setting.id}>
                  <TableCell className="font-mono text-xs font-medium">{setting.key}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-600 max-w-[200px] truncate">{truncateValue(setting.value)}</TableCell>
                  <TableCell><Badge variant="default">{setting.category}</Badge></TableCell>
                  <TableCell className="text-xs text-slate-500 max-w-[200px] truncate">{setting.description || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(setting)} className="p-1.5 hover:bg-slate-100 rounded"><Edit2 className="h-4 w-4 text-slate-400" /></button>
                      <button onClick={() => handleDelete(setting.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-red-400" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditingSetting(null); }} title={editingSetting ? 'Edit Setting' : 'Add Setting'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Key" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="e.g. company_name" />
            <Select label="Category" options={categories} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          <Input label="Value" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="Setting value (JSON or string)" />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe this setting" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingSetting(null); }}>Cancel</Button>
          <Button onClick={handleSave}>{editingSetting ? 'Update' : 'Create'}</Button>
        </DialogFooter>
      </Dialog>

      {/* POS Client Download Section */}
      <Card className="bg-white border-slate-200 shadow-sm mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-4 w-4 text-mine-blue-600" /> POS Client Download
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-mine-blue-50 border border-mine-blue-200 rounded-lg p-3 flex gap-3">
              <Download className="h-4 w-4 text-mine-blue-700" />
              <div>
                <p className="text-sm font-semibold text-mine-blue-900">Offline POS for Windows 10/11 (x64)</p>
                <p className="text-xs text-slate-600">Tauri desktop — SQLite offline queue, ESC/POS, autostart. Same POS, works offline. v1.0.0 • 19.6 MB exe, 6.9 MB MSI, 4.8 MB Setup.</p>
              </div>
            </div>

            <div className="grid gap-3">
              <a href="/downloads/Mineazy-POS-Setup.exe" download className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-mine-blue-300 hover:bg-mine-blue-50 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Setup.exe — Recommended</p>
                  <p className="text-xs text-slate-500">NSIS installer • 4.8 MB • One-click, auto desktop shortcut</p>
                </div>
                <Download className="h-4 w-4 text-mine-blue-700" />
              </a>

              <a href="/downloads/Mineazy-POS.msi" download className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-mine-blue-300 hover:bg-mine-blue-50 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-slate-900">MSI Installer — For IT/Admin</p>
                  <p className="text-xs text-slate-500">Windows Installer • 6.9 MB • Silent deploy / Group Policy</p>
                </div>
                <Download className="h-4 w-4 text-mine-blue-700" />
              </a>

              <a href="/downloads/Mineazy-POS-1.0.0-x64.msi" download className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-slate-700">Alternative: Versioned MSI</p>
                  <p className="text-xs text-slate-500">Mineazy-POS-1.0.0-x64.msi • same as above, versioned filename</p>
                </div>
                <Download className="h-3 w-3 text-slate-500" />
              </a>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <a href="/pos/setup-guide" target="_blank" className="text-mine-blue-700 hover:underline font-medium inline-flex items-center gap-1">
                <LayoutGrid className="h-3 w-3" /> Step-by-step Windows Setup Guide
              </a>
              <span className="text-slate-400">&bull;</span>
              <a href="/POS_DESKTOP.md" target="_blank" className="text-slate-500 hover:underline">Technical docs</a>
            </div>

            <p className="text-xs text-slate-400">After install, DB at %APPDATA%\com.mineazy.pos\mineazy_pos.db — queue syncs on reconnect. Web POS at https://mineazy.com/pos still works.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

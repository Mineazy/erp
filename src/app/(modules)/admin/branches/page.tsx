'use client';

import { toast, dismissToast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Building2, Plus, Search, Edit2, Trash2 } from 'lucide-react';

interface Branch {
  id: string;
  code: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
}

const emptyForm = { code: '', name: '', address: '', city: '', country: '', phone: '', email: '' };

export default function BranchesPage() {
  const [data, setData] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/branches');
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json.data ?? json);
    } catch { setData([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = data.filter((b) =>
    !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.code.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (b: Branch) => { setEditing(b); setForm({ code: b.code, name: b.name, address: b.address || '', city: b.city || '', country: b.country || '', phone: b.phone || '', email: b.email || '' }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.code || !form.name) { toast('Code and name are required', 'error'); return; }
    try {
      const tid = toast(editing ? 'Updating...' : 'Saving...', 'info', 120000);
      let res;
      try {
        res = editing
          ? await fetch(`/api/admin/branches/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
          : await fetch('/api/admin/branches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) { const err = await res.json().catch(() => ({})); dismissToast(tid); toast(err.error || 'Save failed', 'error'); return; }
      dismissToast(tid);
      toast(editing ? 'Branch updated' : 'Branch created', 'success');
      setDialogOpen(false);
      fetchData();
    } catch { toast('Network error', 'error'); }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({ title: 'Delete Branch', message: 'Are you sure? This cannot be undone.', variant: 'danger' });
    if (!ok) return;
    try {
      const tid = toast('Deleting...', 'info', 120000);
      let res;
      try { res = await fetch(`/api/admin/branches/${id}`, { method: 'DELETE' }); } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) { dismissToast(tid); toast('Delete failed', 'error'); return; }
      dismissToast(tid);
      toast('Branch deleted', 'success');
      fetchData();
    } catch { toast('Network error', 'error'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Building2 className="h-6 w-6 text-mine-blue-800" /> Branches</h2>
          <p className="text-slate-500 mt-1">Manage company branches and locations</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Add Branch</Button>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <div className="relative w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input type="text" placeholder="Search branches..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-full" /></div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>City</TableHead><TableHead>Phone</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
              : filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">No branches found</TableCell></TableRow>
              : filtered.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs font-medium">{b.code}</TableCell>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell className="text-sm text-slate-600">{b.city || '—'}</TableCell>
                  <TableCell className="text-sm text-slate-600">{b.phone || '—'}</TableCell>
                  <TableCell><Badge variant={b.isActive ? 'success' : 'secondary'}>{b.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell className="text-right"><div className="flex items-center justify-end gap-1"><button onClick={() => openEdit(b)} className="p-1.5 hover:bg-slate-100 rounded"><Edit2 className="h-4 w-4 text-slate-400" /></button><button onClick={() => handleDelete(b.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-red-400" /></button></div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={editing ? 'Edit Branch' : 'Add Branch'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Branch Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. HR" />
            <Input label="Branch Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Harare Branch" />
          </div>
          <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street address" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="e.g. Harare" />
            <Input label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="e.g. Zimbabwe" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="e.g. +263 24 2700 123" />
            <Input label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="e.g. branch@company.com" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>{editing ? 'Update' : 'Create'}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

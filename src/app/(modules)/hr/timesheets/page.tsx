'use client';

import { toast, dismissToast } from '@/components/ui/toast';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Clock, Plus, Search, Edit2, Download, Upload } from 'lucide-react';

interface Timesheet {
  id: string;
  staffId: string;
  date: string;
  clockIn?: string | null;
  clockOut?: string | null;
  hoursWorked?: number | null;
  overtimeHours?: number | null;
  status: string;
  notes?: string | null;
  staff: { employeeCode: string; firstName: string; lastName: string; department?: string | null };
}

interface StaffOption { id: string; employeeCode: string; firstName: string; lastName: string; branchId?: string | null; department?: string | null; }
interface Branch { id: string; name: string; }

const statusColors: Record<string, string> = {
  present: 'bg-emerald-100 text-emerald-800',
  absent: 'bg-red-100 text-red-800',
  late: 'bg-amber-100 text-amber-800',
  half_day: 'bg-blue-100 text-blue-800',
  rest_day: 'bg-slate-100 text-slate-800',
};

const departments = ['Management', 'Finance', 'Sales', 'Operations', 'Warehouse', 'HR', 'IT', 'Marketing', 'Logistics', 'Administration'];

export default function TimesheetsPage() {
  const [data, setData] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Timesheet | null>(null);
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [formBranchId, setFormBranchId] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [form, setForm] = useState({ staffId: '', date: '', clockIn: '', clockOut: '', status: 'present', notes: '' });
  const [editForm, setEditForm] = useState({ clockIn: '', clockOut: '', overtimeHours: '0', status: 'present', notes: '' });
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const res = await fetch(`/api/hr/timesheets?${params}`);
      if (!res.ok) throw new Error('Failed');
      setData(await res.json());
    } catch { toast('Failed to fetch timesheets', 'error'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [search, statusFilter, dateFrom, dateTo]);
  useEffect(() => {
    fetch('/api/hr/staff').then(r => r.json()).then(d => setStaffList(Array.isArray(d) ? d : [])).catch(() => {});
    fetch('/api/admin/branches').then(r => r.json()).then(d => setBranches(Array.isArray(d) ? d : d.items || [])).catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!form.staffId || !form.date) { toast('Employee and date are required', 'error'); return; }
    const tid = toast('Saving timesheet...', 'info', 120000);
    try {
      const payload = { ...form, clockIn: form.clockIn || null, clockOut: form.clockOut || null };
      const res = await fetch('/api/hr/timesheets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed'); }
      toast('Timesheet entry saved', 'success');
      setDialogOpen(false);
      setForm({ staffId: '', date: '', clockIn: '', clockOut: '', status: 'present', notes: '' });
      fetchData();
    } catch (e: any) { toast(e.message, 'error'); } finally { dismissToast(tid); }
  };

  const openEdit = (t: Timesheet) => {
    setSelectedEntry(t);
    setEditForm({
      clockIn: t.clockIn ? new Date(t.clockIn).toISOString().slice(0, 16) : '',
      clockOut: t.clockOut ? new Date(t.clockOut).toISOString().slice(0, 16) : '',
      overtimeHours: String(t.overtimeHours || 0),
      status: t.status,
      notes: t.notes || '',
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedEntry) return;
    const tid = toast('Updating...', 'info', 120000);
    try {
      const res = await fetch('/api/hr/timesheets', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedEntry.id, ...editForm }) });
      if (!res.ok) throw new Error('Failed');
      toast('Timesheet updated', 'success');
      setEditDialogOpen(false);
      fetchData();
    } catch (e: any) { toast(e.message, 'error'); } finally { dismissToast(tid); }
  };

  const totalHours = data.reduce((s, t) => s + Number(t.hoursWorked || 0), 0);
  const totalOT = data.reduce((s, t) => s + Number(t.overtimeHours || 0), 0);

  const downloadTemplate = async () => {
    const res = await fetch('/api/hr/import?type=timesheets');
    if (!res.ok) { toast('Failed to download template', 'error'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'timesheets_template.xlsx'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!importFile) { toast('Please select a file', 'error'); return; }
    setImporting(true);
    const tid = toast('Importing timesheets...', 'info', 120000);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      fd.append('type', 'timesheets');
      const res = await fetch('/api/hr/import', { method: 'POST', body: fd });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Import failed');
      toast(`Imported ${result.imported} of ${result.total} entries${result.errors?.length ? ` (${result.errors.length} errors)` : ''}`, result.errors?.length ? 'warning' : 'success');
      setImportDialogOpen(false);
      setImportFile(null);
      fetchData();
    } catch (e: any) { toast(e.message, 'error'); } finally { dismissToast(tid); setImporting(false); }
  };

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Timesheets</h2>
          <p className="text-slate-500 mt-1">Track employee attendance and working hours</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={downloadTemplate}><Download className="h-4 w-4 mr-1" /> Template</Button>
          <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}><Upload className="h-4 w-4 mr-1" /> Import</Button>
          <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> Log Time</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Total Entries</p><p className="text-xl font-bold">{data.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Total Hours</p><p className="text-xl font-bold text-blue-600">{totalHours.toFixed(1)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Overtime Hours</p><p className="text-xl font-bold text-amber-600">{totalOT.toFixed(1)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Present Today</p><p className="text-xl font-bold text-emerald-600">{data.filter(t => t.status === 'present').length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-mine-blue-600" /> Time Entries</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input type="search" placeholder="Search employee..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full sm:w-40" />
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full sm:w-40" />
              <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full sm:w-36">
                <option value="">All Status</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="half_day">Half Day</option>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead className="text-center">Hours</TableHead>
                  <TableHead className="text-center">OT</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-400">No timesheet entries found</TableCell></TableRow>
                ) : data.map(t => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium text-sm">{t.staff.firstName} {t.staff.lastName}</span>
                        <p className="text-[11px] text-slate-400">{t.staff.employeeCode}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{new Date(t.date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-sm font-mono">{t.clockIn ? new Date(t.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</TableCell>
                    <TableCell className="text-sm font-mono">{t.clockOut ? new Date(t.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</TableCell>
                    <TableCell className="text-center font-medium">{Number(t.hoursWorked || 0).toFixed(1)}</TableCell>
                    <TableCell className="text-center text-amber-600 font-medium">{Number(t.overtimeHours || 0).toFixed(1)}</TableCell>
                    <TableCell><Badge className={statusColors[t.status] || 'bg-slate-100 text-slate-800'}>{t.status.replace('_', ' ')}</Badge></TableCell>
                    <TableCell className="text-right">
                      <button onClick={() => openEdit(t)} className="p-1.5 hover:bg-slate-100 rounded"><Edit2 className="h-4 w-4 text-slate-400" /></button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} size="md">
        <div className="space-y-4">
          <h3 className="text-lg font-bold">Log Time Entry</h3>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Branch" options={[{ value: '', label: '— All Branches —' }, ...branches.map(b => ({ value: b.id, label: b.name }))]} value={formBranchId} onChange={e => { setFormBranchId(e.target.value); setForm({ ...form, staffId: '' }); }} />
            <Select label="Department" options={[{ value: '', label: '— All Departments —' }, ...departments.map(d => ({ value: d, label: d }))]} value={formDepartment} onChange={e => { setFormDepartment(e.target.value); setForm({ ...form, staffId: '' }); }} />
          </div>
          <Select label="Employee *" options={[{ value: '', label: '— Select Employee —' }, ...staffList.filter(s => !formBranchId || s.branchId === formBranchId).filter(s => !formDepartment || s.department === formDepartment).map(s => ({ value: s.id, label: `${s.employeeCode} - ${s.firstName} ${s.lastName}` }))]} value={form.staffId} onChange={e => setForm({ ...form, staffId: e.target.value })} />
          <Input label="Date *" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Clock In" type="datetime-local" value={form.clockIn} onChange={e => setForm({ ...form, clockIn: e.target.value })} />
            <Input label="Clock Out" type="datetime-local" value={form.clockOut} onChange={e => setForm({ ...form, clockOut: e.target.value })} />
          </div>
          <Select label="Status" options={[{ value: 'present', label: 'Present' }, { value: 'absent', label: 'Absent' }, { value: 'late', label: 'Late' }, { value: 'half_day', label: 'Half Day' }, { value: 'rest_day', label: 'Rest Day' }]} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} />
          <div>
            <Label>Notes</Label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Entry</Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} size="md">
        <div className="space-y-4">
          <h3 className="text-lg font-bold">Edit Time Entry — {selectedEntry?.staff.firstName} {selectedEntry?.staff.lastName}</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Clock In" type="datetime-local" value={editForm.clockIn} onChange={e => setEditForm({ ...editForm, clockIn: e.target.value })} />
            <Input label="Clock Out" type="datetime-local" value={editForm.clockOut} onChange={e => setEditForm({ ...editForm, clockOut: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Overtime Hours" type="number" step="0.5" value={editForm.overtimeHours} onChange={e => setEditForm({ ...editForm, overtimeHours: e.target.value })} />
            <Select label="Status" options={[{ value: 'present', label: 'Present' }, { value: 'absent', label: 'Absent' }, { value: 'late', label: 'Late' }, { value: 'half_day', label: 'Half Day' }]} value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} />
          </div>
          <div>
            <Label>Notes</Label>
            <textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdate}>Update Entry</Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} size="md">
        <div className="space-y-4">
          <h3 className="text-lg font-bold">Bulk Import Timesheets</h3>
          <p className="text-sm text-slate-500">Download the template, fill in your data, then upload the completed file.</p>
          <div>
            <label className="block text-sm font-medium mb-1">Select XLSX File</label>
            <input type="file" accept=".xlsx,.xls" onChange={e => setImportFile(e.target.files?.[0] || null)} className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700" />
          </div>
          {importFile && <p className="text-sm text-slate-600">Selected: {importFile.name}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
          <Button variant="outline" onClick={downloadTemplate}><Download className="h-4 w-4 mr-1" /> Download Template</Button>
          <Button onClick={handleImport} disabled={importing}>{importing ? 'Importing...' : 'Import'}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

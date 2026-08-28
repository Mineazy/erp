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
import { Label } from '@/components/ui/label';
import { Users, Plus, Search, Edit2, Trash2, Eye, Mail, Phone } from 'lucide-react';

interface Staff {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  department?: string | null;
  position?: string | null;
  employmentType: string;
  hireDate: string;
  basicSalary: number;
  branchId?: string | null;
  isActive: boolean;
  manager?: { firstName: string; lastName: string } | null;
}

interface Branch { id: string; name: string; }

const emptyForm = {
  firstName: '', lastName: '', email: '', phone: '', nationalId: '', dateOfBirth: '', gender: '', maritalStatus: '',
  address: '', city: '', emergencyContact: '', emergencyPhone: '', department: '', position: '',
  employmentType: 'full_time', hireDate: '', branchId: '', managerId: '', basicSalary: '', bankName: '', bankAccount: '', notes: '',
};

const departments = ['Management', 'Finance', 'Sales', 'Operations', 'Warehouse', 'HR', 'IT', 'Marketing', 'Logistics', 'Administration'];

export default function StaffPage() {
  const [data, setData] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [allStaff, setAllStaff] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (deptFilter) params.set('department', deptFilter);
      const res = await fetch(`/api/hr/staff?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
    } catch { toast('Failed to fetch staff', 'error'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [search, statusFilter, deptFilter]);
  useEffect(() => {
    fetch('/api/admin/branches').then(r => r.json()).then(d => setBranches(Array.isArray(d) ? d : d.items || [])).catch(() => {});
    fetch('/api/hr/staff').then(r => r.json()).then(d => setAllStaff(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const openCreate = () => { setEditingStaff(null); setForm(emptyForm); setDialogOpen(true); };

  const openEdit = (s: Staff) => {
    setEditingStaff(s);
    setForm({
      firstName: s.firstName, lastName: s.lastName, email: s.email, phone: s.phone || '', nationalId: '', dateOfBirth: '', gender: '', maritalStatus: '',
      address: '', city: '', emergencyContact: '', emergencyPhone: '', department: s.department || '', position: s.position || '',
      employmentType: s.employmentType, hireDate: s.hireDate?.split('T')[0] || '', branchId: s.branchId || '', managerId: '', basicSalary: String(s.basicSalary || 0), bankName: '', bankAccount: '', notes: '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.firstName || !form.lastName) { toast('First name and last name are required', 'error'); return; }
    if (!form.email) { toast('Email is required', 'error'); return; }
    const tid = toast(editingStaff ? 'Updating staff...' : 'Creating staff...', 'info', 120000);
    try {
      const url = editingStaff ? `/api/hr/staff/${editingStaff.id}` : '/api/hr/staff';
      const method = editingStaff ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed'); }
      toast(editingStaff ? 'Staff updated' : 'Staff created', 'success');
      setDialogOpen(false);
      fetchData();
    } catch (e: any) { toast(e.message, 'error'); } finally { dismissToast(tid); }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({ title: 'Delete Staff', message: 'Are you sure? This will delete all related records.', variant: 'danger' });
    if (!ok) return;
    try {
      const res = await fetch(`/api/hr/staff/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      toast('Staff deleted', 'success');
      fetchData();
    } catch { toast('Delete failed', 'error'); }
  };

  const viewStaff = async (s: Staff) => {
    setSelectedStaff(s);
    setViewDialogOpen(true);
  };

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Staff Management</h2>
          <p className="text-slate-500 mt-1">Manage employees, departments and organizational structure</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Add Staff</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Total Staff</p><p className="text-xl font-bold">{data.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Active</p><p className="text-xl font-bold text-green-600">{data.filter(s => s.isActive).length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Departments</p><p className="text-xl font-bold text-blue-600">{new Set(data.map(s => s.department).filter(Boolean)).size}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">On Leave</p><p className="text-xl font-bold text-amber-600">{data.filter(s => !s.isActive).length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-mine-blue-600" /> Employee Directory</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input type="search" placeholder="Search staff..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="w-full sm:w-40">
                <option value="">All Departments</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </Select>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full sm:w-36">
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-400">No staff found</TableCell></TableRow>
                ) : data.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.employeeCode}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{s.firstName} {s.lastName}</span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          {s.email && <span className="flex items-center gap-0.5"><Mail className="h-3 w-3" />{s.email}</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{s.department || '-'}</TableCell>
                    <TableCell>{s.position || '-'}</TableCell>
                    <TableCell className="capitalize text-xs">{s.employmentType?.replace('_', ' ')}</TableCell>
                    <TableCell className="text-xs">{s.manager ? `${s.manager.firstName} ${s.manager.lastName}` : '-'}</TableCell>
                    <TableCell><Badge className={s.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>{s.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <button onClick={() => viewStaff(s)} className="p-1.5 hover:bg-slate-100 rounded"><Eye className="h-4 w-4 text-slate-400" /></button>
                      <button onClick={() => openEdit(s)} className="p-1.5 hover:bg-slate-100 rounded"><Edit2 className="h-4 w-4 text-slate-400" /></button>
                      <button onClick={() => handleDelete(s.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-red-400" /></button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} size="lg">
        <div className="space-y-4">
          <h3 className="text-lg font-bold">{editingStaff ? 'Edit Staff' : 'Add Staff'}</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name *" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} placeholder="John" />
            <Input label="Last Name *" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} placeholder="Doe" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email *" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="john@company.com" />
            <Input label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+263 71 234 5678" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="National ID" value={form.nationalId} onChange={e => setForm({ ...form, nationalId: e.target.value })} placeholder="ID Number" />
            <Input label="Date of Birth" type="date" value={form.dateOfBirth} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Gender" options={[{ value: '', label: '— Select —' }, { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} />
            <Select label="Marital Status" options={[{ value: '', label: '— Select —' }, { value: 'single', label: 'Single' }, { value: 'married', label: 'Married' }, { value: 'divorced', label: 'Divorced' }, { value: 'widowed', label: 'Widowed' }]} value={form.maritalStatus} onChange={e => setForm({ ...form, maritalStatus: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Department" options={[{ value: '', label: '— Select —' }, ...departments.map(d => ({ value: d, label: d }))]} value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
            <Input label="Position" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} placeholder="e.g. Accountant" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Employment Type" options={[{ value: 'full_time', label: 'Full Time' }, { value: 'part_time', label: 'Part Time' }, { value: 'contract', label: 'Contract' }, { value: 'intern', label: 'Intern' }]} value={form.employmentType} onChange={e => setForm({ ...form, employmentType: e.target.value })} />
            <Input label="Hire Date *" type="date" value={form.hireDate} onChange={e => setForm({ ...form, hireDate: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Branch" options={[{ value: '', label: '— No Branch —' }, ...branches.map(b => ({ value: b.id, label: b.name }))]} value={form.branchId} onChange={e => setForm({ ...form, branchId: e.target.value })} />
            <Select label="Manager" options={[{ value: '', label: '— No Manager —' }, ...allStaff.filter(s => s.id !== editingStaff?.id).map(s => ({ value: s.id, label: `${s.firstName} ${s.lastName}` }))]} value={form.managerId} onChange={e => setForm({ ...form, managerId: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Basic Salary" type="number" step="0.01" value={form.basicSalary} onChange={e => setForm({ ...form, basicSalary: e.target.value })} placeholder="0.00" />
            <Input label="Bank Name" value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} placeholder="Bank name" />
            <Input label="Bank Account" value={form.bankAccount} onChange={e => setForm({ ...form, bankAccount: e.target.value })} placeholder="Account number" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>{editingStaff ? 'Update' : 'Create'}</Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} size="lg">
        <div className="space-y-4">
          <h3 className="text-lg font-bold">{selectedStaff?.firstName} {selectedStaff?.lastName}</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-slate-500">Employee Code</p><p className="font-mono">{selectedStaff?.employeeCode}</p></div>
            <div><p className="text-slate-500">Email</p><p>{selectedStaff?.email}</p></div>
            <div><p className="text-slate-500">Phone</p><p>{selectedStaff?.phone || '-'}</p></div>
            <div><p className="text-slate-500">Department</p><p>{selectedStaff?.department || '-'}</p></div>
            <div><p className="text-slate-500">Position</p><p>{selectedStaff?.position || '-'}</p></div>
            <div><p className="text-slate-500">Employment Type</p><p className="capitalize">{selectedStaff?.employmentType?.replace('_', ' ')}</p></div>
            <div><p className="text-slate-500">Hire Date</p><p>{selectedStaff?.hireDate ? new Date(selectedStaff.hireDate).toLocaleDateString() : '-'}</p></div>
            <div><p className="text-slate-500">Salary</p><p>${Number(selectedStaff?.basicSalary || 0).toLocaleString()}</p></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button></DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}

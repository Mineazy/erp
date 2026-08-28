'use client';

import { toast, dismissToast } from '@/components/ui/toast';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Calendar, Plus, Search, CheckCircle, XCircle, Clock, Download, Upload, ChevronLeft, ChevronRight } from 'lucide-react';

interface Leave {
  id: string;
  staffId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string | null;
  contactAddress?: string | null;
  commutedDays: number;
  commutationStatus: string;
  status: string;
  approvedBy?: string | null;
  rejectionNote?: string | null;
  createdAt: string;
  staff: { id: string; employeeCode: string; firstName: string; lastName: string; department?: string | null; position?: string | null; branchId?: string | null };
}

interface StaffOption { id: string; employeeCode: string; firstName: string; lastName: string; branchId?: string | null; department?: string | null; }
interface Branch { id: string; name: string; }

const leaveTypes = ['Annual Leave', 'Sick Leave', 'Maternity Leave', 'Paternity Leave', 'Compassionate Leave', 'Study Leave', 'Unpaid Leave', 'Public Holiday'];
const departments = ['Management', 'Finance', 'Sales', 'Operations', 'Warehouse', 'HR', 'IT', 'Marketing', 'Logistics', 'Administration'];

export default function LeavePage() {
  const [data, setData] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [commutationDecision, setCommutationDecision] = useState('');
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [formBranchId, setFormBranchId] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [form, setForm] = useState({ staffId: '', leaveType: '', startDate: '', endDate: '', reason: '', contactAddress: '', commutedDays: '0' });
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('leaveType', typeFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      params.set('page', String(page));
      params.set('limit', '10');
      const res = await fetch(`/api/hr/leave?${params}`);
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      setData(json.items || []);
      setTotalPages(json.totalPages || 1);
      setTotal(json.total || 0);
    } catch { toast('Failed to fetch leaves', 'error'); } finally { setLoading(false); }
  }, [search, statusFilter, typeFilter, dateFrom, dateTo, page]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    fetch('/api/hr/staff').then(r => r.json()).then(d => setStaffList(Array.isArray(d) ? d : [])).catch(() => {});
    fetch('/api/admin/branches').then(r => r.json()).then(d => setBranches(Array.isArray(d) ? d : d.items || [])).catch(() => {});
  }, []);

  useEffect(() => { setPage(1); }, [search, statusFilter, typeFilter, dateFrom, dateTo]);

  const handleSave = async () => {
    if (!form.staffId || !form.leaveType || !form.startDate || !form.endDate) { toast('Please fill all required fields', 'error'); return; }
    const tid = toast('Submitting leave application...', 'info', 120000);
    try {
      const res = await fetch('/api/hr/leave', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed'); }
      toast('Leave application submitted', 'success');
      setDialogOpen(false);
      setForm({ staffId: '', leaveType: '', startDate: '', endDate: '', reason: '', contactAddress: '', commutedDays: '0' });
      fetchData();
    } catch (e: any) { toast(e.message, 'error'); } finally { dismissToast(tid); }
  };

  const handleApprove = async (id: string, status: string) => {
    const tid = toast(status === 'approved' ? 'Approving...' : status === 'bdm_approved' ? 'Approving (BDM)...' : status === 'manager_approved' ? 'Approving (Ops Manager)...' : 'Rejecting...', 'info', 120000);
    try {
      const body: any = { id, status };
      if (status === 'rejected') body.rejectionNote = rejectionNote;
      if (commutationDecision) body.commutationStatus = commutationDecision;
      const res = await fetch('/api/hr/leave', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed'); }
      const msg = status === 'bdm_approved' ? 'BDM approved' : status === 'manager_approved' ? 'Ops Manager approved' : status === 'approved' ? 'Final approval granted' : 'Leave rejected';
      toast(msg, 'success');
      setApproveDialogOpen(false);
      setSelectedLeave(null);
      setRejectionNote('');
      setCommutationDecision('');
      fetchData();
    } catch (e: any) { toast(e.message, 'error'); } finally { dismissToast(tid); }
  };

  const statusColor = (s: string) => {
    if (s === 'approved') return 'bg-emerald-100 text-emerald-800';
    if (s === 'manager_approved') return 'bg-blue-100 text-blue-800';
    if (s === 'bdm_approved') return 'bg-indigo-100 text-indigo-800';
    if (s === 'rejected') return 'bg-red-100 text-red-800';
    return 'bg-amber-100 text-amber-800';
  };

  const statusLabel = (s: string) => {
    if (s === 'bdm_approved') return 'BDM Approved';
    if (s === 'manager_approved') return 'Ops Manager Approved';
    return s;
  };

  const isBranchStaff = (leave: Leave | null) => !!leave?.staff?.branchId;

  const getApprovalLevel = () => {
    if (!selectedLeave) return 'bdm';
    const hasBranch = isBranchStaff(selectedLeave);
    if (hasBranch) {
      if (selectedLeave.status === 'pending') return 'bdm';
      if (selectedLeave.status === 'bdm_approved') return 'operations';
      return 'director';
    }
    if (selectedLeave.status === 'pending') return 'operations';
    return 'director';
  };

  const downloadTemplate = async () => {
    const res = await fetch('/api/hr/import?type=leave');
    if (!res.ok) { toast('Failed to download template', 'error'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'leave_template.xlsx'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!importFile) { toast('Please select a file', 'error'); return; }
    setImporting(true);
    const tid = toast('Importing leave applications...', 'info', 120000);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      fd.append('type', 'leave');
      const res = await fetch('/api/hr/import', { method: 'POST', body: fd });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Import failed');
      toast(`Imported ${result.imported} of ${result.total} applications${result.errors?.length ? ` (${result.errors.length} errors)` : ''}`, result.errors?.length ? 'warning' : 'success');
      setImportDialogOpen(false);
      setImportFile(null);
      fetchData();
    } catch (e: any) { toast(e.message, 'error'); } finally { dismissToast(tid); setImporting(false); }
  };

  const clearFilters = () => { setSearch(''); setStatusFilter(''); setTypeFilter(''); setDateFrom(''); setDateTo(''); };

  const pageNumbers = () => {
    const nums: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) nums.push(i);
    } else {
      nums.push(1);
      if (page > 3) nums.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) nums.push(i);
      if (page < totalPages - 2) nums.push('...');
      nums.push(totalPages);
    }
    return nums;
  };

  if (loading && data.length === 0) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Leave Applications</h2>
          <p className="text-slate-500 mt-1">Manage employee leave requests and approvals</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={downloadTemplate}><Download className="h-4 w-4 mr-1" /> Template</Button>
          <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}><Upload className="h-4 w-4 mr-1" /> Import</Button>
          <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> New Application</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Total Applications</p><p className="text-xl font-bold">{total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Pending</p><p className="text-xl font-bold text-amber-600">{data.filter(l => l.status === 'pending').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">BDM Approved</p><p className="text-xl font-bold text-indigo-600">{data.filter(l => l.status === 'bdm_approved').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Ops Manager Approved</p><p className="text-xl font-bold text-blue-600">{data.filter(l => l.status === 'manager_approved').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Fully Approved</p><p className="text-xl font-bold text-emerald-600">{data.filter(l => l.status === 'approved').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Rejected</p><p className="text-xl font-bold text-red-600">{data.filter(l => l.status === 'rejected').length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-mine-blue-600" /> Leave Records</CardTitle>
              {(search || statusFilter || typeFilter || dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500 hover:text-slate-700">Clear Filters</Button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input type="search" placeholder="Search by name or employee code..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-full sm:w-44">
                <option value="">All Leave Types</option>
                {leaveTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
              <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full sm:w-44">
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="bdm_approved">BDM Approved</option>
                <option value="manager_approved">Ops Manager Approved</option>
                <option value="approved">Fully Approved</option>
                <option value="rejected">Rejected</option>
              </Select>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full sm:w-40" title="Date From" />
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full sm:w-40" title="Date To" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead className="text-center">Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-center">Commutation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-slate-400">No leave applications found</TableCell></TableRow>
                ) : data.map(l => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium text-sm">{l.staff.firstName} {l.staff.lastName}</span>
                        <p className="text-[11px] text-slate-400">{l.staff.employeeCode} · {l.staff.department || 'N/A'}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{l.leaveType}</TableCell>
                    <TableCell className="text-sm">{new Date(l.startDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-sm">{new Date(l.endDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-center font-medium">{l.days}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{l.reason || '-'}</TableCell>
                    <TableCell className="text-center">
                      {l.commutedDays > 0 ? (
                        <Badge className={
                          l.commutationStatus === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          l.commutationStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-amber-100 text-amber-800'
                        }>{l.commutedDays}d {l.commutationStatus === 'none' ? 'requested' : l.commutationStatus}</Badge>
                      ) : <span className="text-xs text-slate-400">-</span>}
                    </TableCell>
                    <TableCell><Badge className={statusColor(l.status)}>{statusLabel(l.status)}</Badge></TableCell>
                    <TableCell className="text-right">
                      {(l.status === 'pending' || l.status === 'bdm_approved' || l.status === 'manager_approved') && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedLeave(l); setCommutationDecision(''); setApproveDialogOpen(true); }}>
                            <CheckCircle className="h-4 w-4 mr-1 text-emerald-600" /> Review
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-slate-500">Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, total)} of {total} records</p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
                {pageNumbers().map((n, i) => typeof n === 'string' ? (
                  <span key={`e${i}`} className="px-2 text-slate-400">...</span>
                ) : (
                  <Button key={n} variant={n === page ? 'default' : 'outline'} size="sm" onClick={() => setPage(n)} className="min-w-[32px]">{n}</Button>
                ))}
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} size="2xl">
        <div className="space-y-4">
          <h3 className="text-lg font-bold">New Leave Application</h3>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Branch" options={[{ value: '', label: '— All Branches —' }, ...branches.map(b => ({ value: b.id, label: b.name }))]} value={formBranchId} onChange={e => { setFormBranchId(e.target.value); setForm({ ...form, staffId: '' }); }} />
            <Select label="Department" options={[{ value: '', label: '— All Departments —' }, ...departments.map(d => ({ value: d, label: d }))]} value={formDepartment} onChange={e => { setFormDepartment(e.target.value); setForm({ ...form, staffId: '' }); }} />
          </div>
          <Select label="Employee *" options={[{ value: '', label: '— Select Employee —' }, ...staffList.filter(s => !formBranchId || s.branchId === formBranchId).filter(s => !formDepartment || s.department === formDepartment).map(s => ({ value: s.id, label: `${s.employeeCode} - ${s.firstName} ${s.lastName}` }))]} value={form.staffId} onChange={e => setForm({ ...form, staffId: e.target.value })} />
          <Select label="Leave Type *" options={[{ value: '', label: '— Select Type —' }, ...leaveTypes.map(t => ({ value: t, label: t }))]} value={form.leaveType} onChange={e => setForm({ ...form, leaveType: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date *" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
            <Input label="End Date *" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
          </div>
          <div>
            <Label>Contactable Address During Leave</Label>
            <textarea value={form.contactAddress} onChange={e => setForm({ ...form, contactAddress: e.target.value })} placeholder="Address where you can be reached during leave..." className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Days to Commute (convert to payment)" type="number" min="0" max="365" value={form.commutedDays} onChange={e => setForm({ ...form, commutedDays: e.target.value })} placeholder="0" />
            <div className="flex items-end pb-1">
              <p className="text-xs text-slate-500">Number of leave days to convert to cash payment instead of time off</p>
            </div>
          </div>
          <div>
            <Label>Reason</Label>
            <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Reason for leave..." className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>Submit Application</Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={approveDialogOpen} onClose={() => setApproveDialogOpen(false)} size="md">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Review Leave Application</h3>
            <Badge className={getApprovalLevel() === 'bdm' ? 'bg-amber-100 text-amber-800' : getApprovalLevel() === 'operations' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}>
              {getApprovalLevel() === 'bdm' ? 'Level 1: BDM Review' : getApprovalLevel() === 'operations' ? (isBranchStaff(selectedLeave) ? 'Level 2: Ops Manager Review' : 'Level 1: Ops Manager Review') : (isBranchStaff(selectedLeave) ? 'Level 3: Director Review' : 'Level 2: Director Review')}
            </Badge>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg text-sm space-y-1">
            <p><span className="text-slate-500">Employee:</span> {selectedLeave?.staff.firstName} {selectedLeave?.staff.lastName}</p>
            <p><span className="text-slate-500">Type:</span> {selectedLeave?.leaveType}</p>
            <p><span className="text-slate-500">Duration:</span> {selectedLeave?.days} days ({selectedLeave?.startDate ? new Date(selectedLeave.startDate).toLocaleDateString() : ''} - {selectedLeave?.endDate ? new Date(selectedLeave.endDate).toLocaleDateString() : ''})</p>
            {selectedLeave?.contactAddress && <p><span className="text-slate-500">Contact Address:</span> {selectedLeave.contactAddress}</p>}
            {selectedLeave?.reason && <p><span className="text-slate-500">Reason:</span> {selectedLeave.reason}</p>}
            {selectedLeave?.status === 'bdm_approved' && <p className="text-indigo-600 font-medium">✓ Already approved by BDM</p>}
            {selectedLeave?.status === 'manager_approved' && <p className="text-blue-600 font-medium">✓ Already approved by Operations Manager</p>}
          </div>
          {selectedLeave?.commutedDays && selectedLeave.commutedDays > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
              <p className="text-sm font-medium text-amber-800">Commutation Request: {selectedLeave.commutedDays} day(s) to convert to payment</p>
              <Select label="Commutation Decision" options={[{ value: '', label: '— No Decision —' }, { value: 'approved', label: 'Approve Commutation' }, { value: 'rejected', label: 'Reject Commutation' }]} value={commutationDecision} onChange={e => setCommutationDecision(e.target.value)} />
            </div>
          )}
          <div>
            <Label>Rejection Note (if rejecting)</Label>
            <textarea value={rejectionNote} onChange={e => setRejectionNote(e.target.value)} placeholder="Optional rejection reason..." className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
          <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => selectedLeave && handleApprove(selectedLeave.id, 'rejected')}>Reject</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => {
            if (!selectedLeave) return;
            const level = getApprovalLevel();
            if (level === 'bdm') {
              handleApprove(selectedLeave.id, 'bdm_approved');
            } else if (level === 'operations') {
              handleApprove(selectedLeave.id, 'manager_approved');
            } else {
              handleApprove(selectedLeave.id, 'approved');
            }
          }}>
            {getApprovalLevel() === 'bdm' ? 'BDM Approve' : getApprovalLevel() === 'operations' ? 'Ops Manager Approve' : 'Final Approve'}
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} size="md">
        <div className="space-y-4">
          <h3 className="text-lg font-bold">Bulk Import Leave Applications</h3>
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

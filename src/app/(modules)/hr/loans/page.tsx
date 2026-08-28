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
import { Banknote, Plus, Search, CheckCircle, XCircle, Download, Upload } from 'lucide-react';

interface Loan {
  id: string;
  staffId: string;
  loanType: string;
  amount: number;
  monthlyDeduction: number;
  outstandingBalance: number;
  startDate: string;
  endDate?: string | null;
  reason?: string | null;
  status: string;
  approvedBy?: string | null;
  rejectionNote?: string | null;
  createdAt: string;
  staff: { employeeCode: string; firstName: string; lastName: string; department?: string | null; basicSalary: number };
}

interface StaffOption { id: string; employeeCode: string; firstName: string; lastName: string; basicSalary: number; }

const loanTypes = ['Salary Advance', 'Emergency Loan', 'Education Loan', 'Housing Loan', 'Vehicle Loan', 'Personal Loan'];

export default function LoansPage() {
  const [data, setData] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [deductionEdit, setDeductionEdit] = useState('');
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [form, setForm] = useState({ staffId: '', loanType: '', amount: '', monthlyDeduction: '', startDate: '', endDate: '', reason: '' });
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/hr/loans?${params}`);
      if (!res.ok) throw new Error('Failed');
      setData(await res.json());
    } catch { toast('Failed to fetch loans', 'error'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [search, statusFilter]);
  useEffect(() => { fetch('/api/hr/staff').then(r => r.json()).then(d => setStaffList(Array.isArray(d) ? d : [])).catch(() => {}); }, []);

  const handleSave = async () => {
    if (!form.staffId || !form.loanType || !form.amount || !form.startDate) { toast('Please fill all required fields', 'error'); return; }
    const tid = toast('Submitting loan application...', 'info', 120000);
    try {
      const res = await fetch('/api/hr/loans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed'); }
      toast('Loan application submitted', 'success');
      setDialogOpen(false);
      setForm({ staffId: '', loanType: '', amount: '', monthlyDeduction: '', startDate: '', endDate: '', reason: '' });
      fetchData();
    } catch (e: any) { toast(e.message, 'error'); } finally { dismissToast(tid); }
  };

  const openApprove = (loan: Loan) => {
    setSelectedLoan(loan);
    setDeductionEdit(String(loan.monthlyDeduction));
    setRejectionNote('');
    setApproveDialogOpen(true);
  };

  const handleApprove = async (id: string, status: string) => {
    const tid = toast(status === 'approved' ? 'Approving...' : 'Rejecting...', 'info', 120000);
    try {
      const body: any = { id, status };
      if (status === 'approved') body.monthlyDeduction = deductionEdit;
      if (status === 'rejected') body.rejectionNote = rejectionNote;
      const res = await fetch('/api/hr/loans', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Failed');
      toast(status === 'approved' ? 'Loan approved' : 'Loan rejected', 'success');
      setApproveDialogOpen(false);
      fetchData();
    } catch (e: any) { toast(e.message, 'error'); } finally { dismissToast(tid); }
  };

  const statusColor = (s: string) => {
    if (s === 'approved') return 'bg-emerald-100 text-emerald-800';
    if (s === 'rejected') return 'bg-red-100 text-red-800';
    if (s === 'completed') return 'bg-blue-100 text-blue-800';
    return 'bg-amber-100 text-amber-800';
  };

  const totalLoans = data.reduce((s, l) => s + Number(l.amount), 0);
  const totalOutstanding = data.reduce((s, l) => s + Number(l.outstandingBalance), 0);

  const downloadTemplate = async () => {
    const res = await fetch('/api/hr/import?type=loans');
    if (!res.ok) { toast('Failed to download template', 'error'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'loans_template.xlsx'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!importFile) { toast('Please select a file', 'error'); return; }
    setImporting(true);
    const tid = toast('Importing loan applications...', 'info', 120000);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      fd.append('type', 'loans');
      const res = await fetch('/api/hr/import', { method: 'POST', body: fd });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Import failed');
      toast(`Imported ${result.imported} of ${result.total} loans${result.errors?.length ? ` (${result.errors.length} errors)` : ''}`, result.errors?.length ? 'warning' : 'success');
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
          <h2 className="text-2xl font-bold text-slate-900">Loan Applications</h2>
          <p className="text-slate-500 mt-1">Manage employee loan requests and deductions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={downloadTemplate}><Download className="h-4 w-4 mr-1" /> Template</Button>
          <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}><Upload className="h-4 w-4 mr-1" /> Import</Button>
          <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> New Application</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Total Applications</p><p className="text-xl font-bold">{data.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Pending</p><p className="text-xl font-bold text-amber-600">{data.filter(l => l.status === 'pending').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Total Loan Value</p><p className="text-xl font-bold text-blue-600">${totalLoans.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Outstanding Balance</p><p className="text-xl font-bold text-red-600">${totalOutstanding.toLocaleString()}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5 text-mine-blue-600" /> Loan Records</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input type="search" placeholder="Search employee..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full sm:w-36">
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="completed">Completed</option>
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
                  <TableHead>Loan Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Monthly Deduction</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-400">No loan applications found</TableCell></TableRow>
                ) : data.map(l => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium text-sm">{l.staff.firstName} {l.staff.lastName}</span>
                        <p className="text-[11px] text-slate-400">{l.staff.employeeCode} · {l.staff.department || 'N/A'}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{l.loanType}</TableCell>
                    <TableCell className="text-right font-mono font-medium">${Number(l.amount).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono text-sm">${Number(l.monthlyDeduction).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-red-600">${Number(l.outstandingBalance).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{new Date(l.startDate).toLocaleDateString()}</TableCell>
                    <TableCell><Badge className={statusColor(l.status)}>{l.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      {l.status === 'pending' && (
                        <Button variant="ghost" size="sm" onClick={() => openApprove(l)}>
                          <CheckCircle className="h-4 w-4 mr-1 text-emerald-600" /> Review
                        </Button>
                      )}
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
          <h3 className="text-lg font-bold">New Loan Application</h3>
          <Select label="Employee *" options={[{ value: '', label: '— Select Employee —' }, ...staffList.map(s => ({ value: s.id, label: `${s.employeeCode} - ${s.firstName} ${s.lastName}` }))]} value={form.staffId} onChange={e => setForm({ ...form, staffId: e.target.value })} />
          <Select label="Loan Type *" options={[{ value: '', label: '— Select Type —' }, ...loanTypes.map(t => ({ value: t, label: t }))]} value={form.loanType} onChange={e => setForm({ ...form, loanType: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Loan Amount *" type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
            <Input label="Monthly Deduction" type="number" step="0.01" value={form.monthlyDeduction} onChange={e => setForm({ ...form, monthlyDeduction: e.target.value })} placeholder="0.00" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date *" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
            <Input label="End Date" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
          </div>
          <div>
            <Label>Reason</Label>
            <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Reason for loan..." className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>Submit Application</Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={approveDialogOpen} onClose={() => setApproveDialogOpen(false)} size="md">
        <div className="space-y-4">
          <h3 className="text-lg font-bold">Review Loan Application</h3>
          <div className="bg-slate-50 p-3 rounded-lg text-sm space-y-1">
            <p><span className="text-slate-500">Employee:</span> {selectedLoan?.staff.firstName} {selectedLoan?.staff.lastName}</p>
            <p><span className="text-slate-500">Type:</span> {selectedLoan?.loanType}</p>
            <p><span className="text-slate-500">Amount:</span> ${Number(selectedLoan?.amount || 0).toLocaleString()}</p>
            <p><span className="text-slate-500">Salary:</span> ${Number(selectedLoan?.staff.basicSalary || 0).toLocaleString()}</p>
          </div>
          <Input label="Monthly Deduction" type="number" step="0.01" value={deductionEdit} onChange={e => setDeductionEdit(e.target.value)} />
          <div>
            <Label>Rejection Note (if rejecting)</Label>
            <textarea value={rejectionNote} onChange={e => setRejectionNote(e.target.value)} placeholder="Optional rejection reason..." className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
          <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => selectedLoan && handleApprove(selectedLoan.id, 'rejected')}>Reject</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => selectedLoan && handleApprove(selectedLoan.id, 'approved')}>Approve</Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} size="md">
        <div className="space-y-4">
          <h3 className="text-lg font-bold">Bulk Import Loan Applications</h3>
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

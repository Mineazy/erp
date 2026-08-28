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
import { ShieldAlert, Plus, Search, AlertTriangle, Calendar, Eye, Gavel, Clock, ChevronLeft, ChevronRight, Bell, X } from 'lucide-react';

interface DisciplinaryCase {
  id: string;
  caseNumber: string;
  staffId: string;
  incidentType: string;
  incidentDate: string;
  incidentLocation?: string | null;
  description: string;
  witnesses?: string | null;
  reportedBy?: string | null;
  warningLevel: string;
  status: string;
  nextHearingDate?: string | null;
  nextHearingTime?: string | null;
  nextHearingVenue?: string | null;
  hearingNotes?: string | null;
  resolution?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  staff: { id: string; employeeCode: string; firstName: string; lastName: string; department?: string | null; position?: string | null; branchId?: string | null };
  hearings: Hearing[];
}

interface Hearing {
  id: string;
  caseId: string;
  hearingDate: string;
  hearingTime?: string | null;
  venue?: string | null;
  verdict?: string | null;
  outcome?: string | null;
  notes?: string | null;
  conductedBy?: string | null;
  nextHearingDate?: string | null;
  nextHearingTime?: string | null;
  nextHearingVenue?: string | null;
  warningIssued?: string | null;
  createdAt: string;
}

interface StaffOption { id: string; employeeCode: string; firstName: string; lastName: string; department?: string | null; position?: string | null; branchId?: string | null; }

interface Notification {
  id: string;
  caseNumber: string;
  staffName: string;
  employeeCode: string;
  department?: string | null;
  incidentType: string;
  warningLevel: string;
  nextHearingDate: string;
  nextHearingTime?: string | null;
  nextHearingVenue?: string | null;
  severity: 'critical' | 'warning' | 'info';
  urgencyLabel: string;
  message: string;
}

const incidentTypes = ['Misconduct', 'Insubordination', 'Theft', 'Fraud', 'Absenteeism', 'Tardiness', 'Safety Violation', 'Harassment', 'Policy Violation', 'Poor Performance', 'Destruction of Property', 'Substance Abuse', 'Unauthorized Disclosure', 'Other'];
const warningLevels = ['none', 'verbal_warning', 'first_written_warning', 'final_written_warning'];
const verdictOptions = ['verbal_warning', 'first_written_warning', 'final_warning', 'no_action', 'dismissed', 'adjourned', 'other'];
const statusOptions = ['open', 'under_review', 'hearing_scheduled', 'resolved', 'closed'];

export default function DisciplinaryPage() {
  const [data, setData] = useState<DisciplinaryCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [warningFilter, setWarningFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [staffList, setStaffList] = useState<StaffOption[]>([]);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [form, setForm] = useState({ staffId: '', incidentType: '', incidentDate: '', incidentLocation: '', description: '', witnesses: '', reportedBy: '' });

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<DisciplinaryCase | null>(null);

  const [hearingDialogOpen, setHearingDialogOpen] = useState(false);
  const [hearingForm, setHearingForm] = useState({ hearingDate: '', hearingTime: '', venue: '', conductedBy: '', verdict: '', outcome: '', notes: '', nextHearingDate: '', nextHearingTime: '', nextHearingVenue: '', warningIssued: '' });

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ status: '', warningLevel: '', resolution: '', nextHearingDate: '', nextHearingTime: '', nextHearingVenue: '', hearingNotes: '' });

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (warningFilter) params.set('warningLevel', warningFilter);
      params.set('page', String(page));
      params.set('limit', '10');
      const res = await fetch(`/api/hr/disciplinary?${params}`);
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      setData(Array.isArray(json) ? json : json.items || []);
      setTotalPages(json.totalPages || 1);
      setTotal(json.total || (Array.isArray(json) ? json.length : 0));
    } catch { toast('Failed to fetch disciplinary cases', 'error'); } finally { setLoading(false); }
  }, [search, statusFilter, warningFilter, page]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/hr/disciplinary/notifications');
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.notifications || []);
      }
    } catch {}
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);
  useEffect(() => {
    fetch('/api/hr/staff').then(r => r.json()).then(d => setStaffList(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);
  useEffect(() => { setPage(1); }, [search, statusFilter, warningFilter]);

  const handleCreate = async () => {
    if (!form.staffId || !form.incidentType || !form.incidentDate || !form.description) {
      toast('Please fill all required fields', 'error'); return;
    }
    const tid = toast('Creating case...', 'info', 120000);
    try {
      const res = await fetch('/api/hr/disciplinary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed'); }
      toast('Disciplinary case created', 'success');
      setCreateDialogOpen(false);
      setForm({ staffId: '', incidentType: '', incidentDate: '', incidentLocation: '', description: '', witnesses: '', reportedBy: '' });
      fetchData();
      fetchNotifications();
    } catch (e: any) { toast(e.message, 'error'); } finally { dismissToast(tid); }
  };

  const handleAddHearing = async () => {
    if (!selectedCase || !hearingForm.hearingDate) { toast('Hearing date is required', 'error'); return; }
    const tid = toast('Recording hearing...', 'info', 120000);
    try {
      const res = await fetch(`/api/hr/disciplinary/${selectedCase.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addHearing', ...hearingForm }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed'); }
      toast('Hearing recorded', 'success');
      setHearingDialogOpen(false);
      setHearingForm({ hearingDate: '', hearingTime: '', venue: '', conductedBy: '', verdict: '', outcome: '', notes: '', nextHearingDate: '', nextHearingTime: '', nextHearingVenue: '', warningIssued: '' });
      fetchData();
      fetchNotifications();
      const updated = await fetch(`/api/hr/disciplinary/${selectedCase.id}`).then(r => r.json());
      setSelectedCase(updated);
    } catch (e: any) { toast(e.message, 'error'); } finally { dismissToast(tid); }
  };

  const handleUpdateCase = async () => {
    if (!selectedCase) return;
    const tid = toast('Updating case...', 'info', 120000);
    try {
      const res = await fetch('/api/hr/disciplinary', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedCase.id, ...editForm }) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed'); }
      toast('Case updated', 'success');
      setEditDialogOpen(false);
      fetchData();
      fetchNotifications();
    } catch (e: any) { toast(e.message, 'error'); } finally { dismissToast(tid); }
  };

  const openView = async (c: DisciplinaryCase) => {
    try {
      const res = await fetch(`/api/hr/disciplinary/${c.id}`);
      if (res.ok) { setSelectedCase(await res.json()); } else { setSelectedCase(c); }
    } catch { setSelectedCase(c); }
    setViewDialogOpen(true);
  };

  const openEdit = (c: DisciplinaryCase) => {
    setSelectedCase(c);
    setEditForm({
      status: c.status,
      warningLevel: c.warningLevel,
      resolution: c.resolution || '',
      nextHearingDate: c.nextHearingDate ? new Date(c.nextHearingDate).toISOString().split('T')[0] : '',
      nextHearingTime: c.nextHearingTime || '',
      nextHearingVenue: c.nextHearingVenue || '',
      hearingNotes: c.hearingNotes || '',
    });
    setEditDialogOpen(true);
  };

  const statusColor = (s: string) => {
    if (s === 'resolved') return 'bg-emerald-100 text-emerald-800';
    if (s === 'closed') return 'bg-slate-100 text-slate-800';
    if (s === 'hearing_scheduled') return 'bg-blue-100 text-blue-800';
    if (s === 'under_review') return 'bg-indigo-100 text-indigo-800';
    return 'bg-amber-100 text-amber-800';
  };

  const warningColor = (w: string) => {
    if (w === 'final_written_warning') return 'bg-red-100 text-red-800';
    if (w === 'first_written_warning') return 'bg-orange-100 text-orange-800';
    if (w === 'verbal_warning') return 'bg-amber-100 text-amber-800';
    return 'bg-slate-100 text-slate-600';
  };

  const warningLabel = (w: string) => {
    if (w === 'verbal_warning') return 'Verbal Warning';
    if (w === 'first_written_warning') return '1st Written Warning';
    if (w === 'final_written_warning') return 'Final Written Warning';
    if (w === 'none') return 'No Warning';
    return w;
  };

  const clearFilters = () => { setSearch(''); setStatusFilter(''); setWarningFilter(''); };

  const pageNumbers = () => {
    const nums: (number | string)[] = [];
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) nums.push(i); }
    else {
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
          <h2 className="text-2xl font-bold text-slate-900">Disciplinary Issues</h2>
          <p className="text-slate-500 mt-1">Track and manage staff disciplinary cases, hearings, and warnings</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setShowNotifications(!showNotifications)}>
              <Bell className="h-4 w-4 mr-1" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">{notifications.length}</span>
              )}
              Hearings Due
            </Button>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> Report Incident</Button>
        </div>
      </div>

      {showNotifications && notifications.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-amber-800">
                <Bell className="h-5 w-5" /> Upcoming Hearings ({notifications.length})
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowNotifications(false)}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {notifications.map(n => (
              <div key={n.id} className={`flex items-center justify-between p-3 rounded-lg border ${n.severity === 'critical' ? 'bg-red-50 border-red-200' : n.severity === 'warning' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
                <div>
                  <p className="text-sm font-medium">{n.caseNumber} — {n.staffName} ({n.employeeCode})</p>
                  <p className="text-xs text-slate-500">{n.incidentType} · {warningLabel(n.warningLevel)}</p>
                  <p className="text-xs mt-1">
                    <span className="font-medium">Hearing:</span>{' '}
                    {new Date(n.nextHearingDate).toLocaleDateString()}
                    {n.nextHearingTime ? ` at ${n.nextHearingTime}` : ''}
                    {n.nextHearingVenue ? ` — ${n.nextHearingVenue}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <Badge className={n.severity === 'critical' ? 'bg-red-100 text-red-800' : n.severity === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}>
                    {n.urgencyLabel}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Total Cases</p><p className="text-xl font-bold">{data.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Open</p><p className="text-xl font-bold text-amber-600">{data.filter(c => c.status === 'open').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Under Review</p><p className="text-xl font-bold text-indigo-600">{data.filter(c => c.status === 'under_review').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Hearing Scheduled</p><p className="text-xl font-bold text-blue-600">{data.filter(c => c.status === 'hearing_scheduled').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Resolved</p><p className="text-xl font-bold text-emerald-600">{data.filter(c => c.status === 'resolved').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Final Warnings</p><p className="text-xl font-bold text-red-600">{data.filter(c => c.warningLevel === 'final_written_warning').length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-mine-blue-600" /> Disciplinary Cases</CardTitle>
              {(search || statusFilter || warningFilter) && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500 hover:text-slate-700">Clear Filters</Button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input type="search" placeholder="Search by name, case number..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full sm:w-44">
                <option value="">All Status</option>
                {statusOptions.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
              </Select>
              <Select value={warningFilter} onChange={e => setWarningFilter(e.target.value)} className="w-full sm:w-44">
                <option value="">All Warnings</option>
                {warningLevels.map(w => <option key={w} value={w}>{warningLabel(w)}</option>)}
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Case #</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Incident Type</TableHead>
                  <TableHead>Incident Date</TableHead>
                  <TableHead>Warning Level</TableHead>
                  <TableHead>Next Hearing</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-400">No disciplinary cases found</TableCell></TableRow>
                ) : data.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-sm font-medium">{c.caseNumber}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium text-sm">{c.staff.firstName} {c.staff.lastName}</span>
                        <p className="text-[11px] text-slate-400">{c.staff.employeeCode} · {c.staff.department || 'N/A'}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{c.incidentType}</TableCell>
                    <TableCell className="text-sm">{new Date(c.incidentDate).toLocaleDateString()}</TableCell>
                    <TableCell><Badge className={warningColor(c.warningLevel)}>{warningLabel(c.warningLevel)}</Badge></TableCell>
                    <TableCell className="text-sm">
                      {c.nextHearingDate ? (
                        <div>
                          <span className="font-medium">{new Date(c.nextHearingDate).toLocaleDateString()}</span>
                          {c.nextHearingTime && <p className="text-[11px] text-slate-400">{c.nextHearingTime}</p>}
                          {c.nextHearingVenue && <p className="text-[11px] text-slate-400">{c.nextHearingVenue}</p>}
                        </div>
                      ) : <span className="text-slate-400">—</span>}
                    </TableCell>
                    <TableCell><Badge className={statusColor(c.status)}>{c.status.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openView(c)}>
                          <Eye className="h-4 w-4 mr-1" /> View
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                          <Gavel className="h-4 w-4 mr-1" /> Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
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

      {/* Create Case Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} size="2xl">
        <div className="space-y-4">
          <h3 className="text-lg font-bold">Report Disciplinary Incident</h3>
          <Select label="Employee *" options={[{ value: '', label: '— Select Employee —' }, ...staffList.filter(s => s.id).map(s => ({ value: s.id, label: `${s.employeeCode} - ${s.firstName} ${s.lastName}` }))]} value={form.staffId} onChange={e => setForm({ ...form, staffId: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Incident Type *" options={[{ value: '', label: '— Select Type —' }, ...incidentTypes.map(t => ({ value: t, label: t }))]} value={form.incidentType} onChange={e => setForm({ ...form, incidentType: e.target.value })} />
            <Input label="Incident Date *" type="date" value={form.incidentDate} onChange={e => setForm({ ...form, incidentDate: e.target.value })} />
          </div>
          <Input label="Incident Location" value={form.incidentLocation} onChange={e => setForm({ ...form, incidentLocation: e.target.value })} placeholder="e.g. Warehouse, Office, etc." />
          <div>
            <Label>Description *</Label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Detailed description of the incident..." className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500" rows={4} />
          </div>
          <div>
            <Label>Witnesses</Label>
            <textarea value={form.witnesses} onChange={e => setForm({ ...form, witnesses: e.target.value })} placeholder="Names of witnesses (if any)..." className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500" rows={2} />
          </div>
          <Input label="Reported By" value={form.reportedBy} onChange={e => setForm({ ...form, reportedBy: e.target.value })} placeholder="Name of person reporting" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate}>Create Case</Button>
        </DialogFooter>
      </Dialog>

      {/* View Case Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} size="3xl">
        {selectedCase && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">{selectedCase.caseNumber}</h3>
                <p className="text-sm text-slate-500">{selectedCase.staff.firstName} {selectedCase.staff.lastName} ({selectedCase.staff.employeeCode})</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={statusColor(selectedCase.status)}>{selectedCase.status.replace(/_/g, ' ')}</Badge>
                <Badge className={warningColor(selectedCase.warningLevel)}>{warningLabel(selectedCase.warningLevel)}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-500">Incident Type:</span> <span className="font-medium">{selectedCase.incidentType}</span></div>
              <div><span className="text-slate-500">Incident Date:</span> <span className="font-medium">{new Date(selectedCase.incidentDate).toLocaleDateString()}</span></div>
              {selectedCase.incidentLocation && <div><span className="text-slate-500">Location:</span> <span className="font-medium">{selectedCase.incidentLocation}</span></div>}
              {selectedCase.reportedBy && <div><span className="text-slate-500">Reported By:</span> <span className="font-medium">{selectedCase.reportedBy}</span></div>}
              {selectedCase.staff.department && <div><span className="text-slate-500">Department:</span> <span className="font-medium">{selectedCase.staff.department}</span></div>}
              {selectedCase.staff.position && <div><span className="text-slate-500">Position:</span> <span className="font-medium">{selectedCase.staff.position}</span></div>}
            </div>

            <div className="text-sm">
              <p className="text-slate-500 mb-1">Description:</p>
              <p className="bg-slate-50 p-3 rounded-lg">{selectedCase.description}</p>
            </div>

            {selectedCase.witnesses && (
              <div className="text-sm">
                <p className="text-slate-500 mb-1">Witnesses:</p>
                <p className="bg-slate-50 p-3 rounded-lg">{selectedCase.witnesses}</p>
              </div>
            )}

            {selectedCase.resolution && (
              <div className="text-sm">
                <p className="text-slate-500 mb-1">Resolution:</p>
                <p className="bg-emerald-50 p-3 rounded-lg text-emerald-800">{selectedCase.resolution}</p>
              </div>
            )}

            {selectedCase.hearings.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-sm">Hearing History ({selectedCase.hearings.length})</h4>
                  <Button variant="outline" size="sm" onClick={() => {
                    setHearingForm({ hearingDate: '', hearingTime: '', venue: '', conductedBy: '', verdict: '', outcome: '', notes: '', nextHearingDate: '', nextHearingTime: '', nextHearingVenue: '', warningIssued: '' });
                    setHearingDialogOpen(true);
                  }}><Plus className="h-4 w-4 mr-1" /> Record Hearing</Button>
                </div>
                <div className="space-y-3">
                  {selectedCase.hearings.map((h, i) => (
                    <div key={h.id} className="border rounded-lg p-4 bg-slate-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-indigo-100 text-indigo-800">Hearing #{i + 1}</Badge>
                          <span className="text-sm font-medium">{new Date(h.hearingDate).toLocaleDateString()}</span>
                          {h.hearingTime && <span className="text-sm text-slate-500">at {h.hearingTime}</span>}
                        </div>
                        {h.warningIssued && <Badge className={warningColor(h.warningIssued)}>{warningLabel(h.warningIssued)}</Badge>}
                      </div>
                      {h.venue && <p className="text-sm text-slate-600"><span className="text-slate-400">Venue:</span> {h.venue}</p>}
                      {h.conductedBy && <p className="text-sm text-slate-600"><span className="text-slate-400">Conducted By:</span> {h.conductedBy}</p>}
                      {h.verdict && <p className="text-sm text-slate-600"><span className="text-slate-400">Verdict:</span> <span className="font-medium">{h.verdict.replace(/_/g, ' ')}</span></p>}
                      {h.outcome && <p className="text-sm text-slate-600"><span className="text-slate-400">Outcome:</span> {h.outcome}</p>}
                      {h.notes && <p className="text-sm text-slate-600 mt-1"><span className="text-slate-400">Notes:</span> {h.notes}</p>}
                      {h.nextHearingDate && (
                        <div className="mt-2 bg-blue-50 border border-blue-200 p-2 rounded text-sm">
                          <span className="text-blue-700 font-medium">Next Hearing:</span>{' '}
                          {new Date(h.nextHearingDate).toLocaleDateString()}
                          {h.nextHearingTime ? ` at ${h.nextHearingTime}` : ''}
                          {h.nextHearingVenue ? ` — ${h.nextHearingVenue}` : ''}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedCase.hearings.length === 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">No hearings recorded yet</p>
                <Button variant="outline" size="sm" onClick={() => {
                  setHearingForm({ hearingDate: '', hearingTime: '', venue: '', conductedBy: '', verdict: '', outcome: '', notes: '', nextHearingDate: '', nextHearingTime: '', nextHearingVenue: '', warningIssued: '' });
                  setHearingDialogOpen(true);
                }}><Plus className="h-4 w-4 mr-1" /> Record First Hearing</Button>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogFooter>
      </Dialog>

      {/* Add Hearing Dialog */}
      <Dialog open={hearingDialogOpen} onClose={() => setHearingDialogOpen(false)} size="2xl">
        <div className="space-y-4">
          <h3 className="text-lg font-bold">Record Hearing — {selectedCase?.caseNumber}</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Hearing Date *" type="date" value={hearingForm.hearingDate} onChange={e => setHearingForm({ ...hearingForm, hearingDate: e.target.value })} />
            <Input label="Hearing Time" type="time" value={hearingForm.hearingTime} onChange={e => setHearingForm({ ...hearingForm, hearingTime: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Venue" value={hearingForm.venue} onChange={e => setHearingForm({ ...hearingForm, venue: e.target.value })} placeholder="e.g. Boardroom, HR Office" />
            <Input label="Conducted By" value={hearingForm.conductedBy} onChange={e => setHearingForm({ ...hearingForm, conductedBy: e.target.value })} placeholder="Name of hearing chairperson" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Verdict" options={[{ value: '', label: '— Select Verdict —' }, ...verdictOptions.map(v => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }))]} value={hearingForm.verdict} onChange={e => setHearingForm({ ...hearingForm, verdict: e.target.value })} />
            <Select label="Warning Issued" options={[{ value: '', label: '— No Warning —' }, ...warningLevels.filter(w => w !== 'none').map(w => ({ value: w, label: warningLabel(w) }))]} value={hearingForm.warningIssued} onChange={e => setHearingForm({ ...hearingForm, warningIssued: e.target.value })} />
          </div>
          <div>
            <Label>Outcome / Decision</Label>
            <textarea value={hearingForm.outcome} onChange={e => setHearingForm({ ...hearingForm, outcome: e.target.value })} placeholder="Detailed outcome of the hearing..." className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500" rows={3} />
          </div>
          <div>
            <Label>Notes</Label>
            <textarea value={hearingForm.notes} onChange={e => setHearingForm({ ...hearingForm, notes: e.target.value })} placeholder="Additional notes..." className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500" rows={2} />
          </div>
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-slate-700 mb-3">Schedule Next Hearing (optional)</p>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Next Hearing Date" type="date" value={hearingForm.nextHearingDate} onChange={e => setHearingForm({ ...hearingForm, nextHearingDate: e.target.value })} />
              <Input label="Next Hearing Time" type="time" value={hearingForm.nextHearingTime} onChange={e => setHearingForm({ ...hearingForm, nextHearingTime: e.target.value })} />
              <Input label="Next Hearing Venue" value={hearingForm.nextHearingVenue} onChange={e => setHearingForm({ ...hearingForm, nextHearingVenue: e.target.value })} placeholder="Venue" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setHearingDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddHearing}>Save Hearing</Button>
        </DialogFooter>
      </Dialog>

      {/* Edit Case Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} size="lg">
        <div className="space-y-4">
          <h3 className="text-lg font-bold">Update Case — {selectedCase?.caseNumber}</h3>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Status" options={statusOptions.map(s => ({ value: s, label: s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }))} value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} />
            <Select label="Warning Level" options={warningLevels.map(w => ({ value: w, label: warningLabel(w) }))} value={editForm.warningLevel} onChange={e => setEditForm({ ...editForm, warningLevel: e.target.value })} />
          </div>
          <div>
            <Label>Resolution</Label>
            <textarea value={editForm.resolution} onChange={e => setEditForm({ ...editForm, resolution: e.target.value })} placeholder="Case resolution details..." className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500" rows={3} />
          </div>
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-slate-700 mb-3">Next Hearing Schedule</p>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Next Hearing Date" type="date" value={editForm.nextHearingDate} onChange={e => setEditForm({ ...editForm, nextHearingDate: e.target.value })} />
              <Input label="Next Hearing Time" type="time" value={editForm.nextHearingTime} onChange={e => setEditForm({ ...editForm, nextHearingTime: e.target.value })} />
              <Input label="Next Hearing Venue" value={editForm.nextHearingVenue} onChange={e => setEditForm({ ...editForm, nextHearingVenue: e.target.value })} placeholder="Venue" />
            </div>
          </div>
          <div>
            <Label>Hearing Notes</Label>
            <textarea value={editForm.hearingNotes} onChange={e => setEditForm({ ...editForm, hearingNotes: e.target.value })} placeholder="Notes for next hearing..." className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateCase}>Update Case</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

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
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { BarChart3, Plus, Search, Edit2, Trash2, FileText, Download, Eye, BookOpen, Receipt, Users, Package, TrendingUp } from 'lucide-react';

interface SavedReport {
  id: string;
  name: string;
  type: string;
  createdBy: string;
  isPublic: boolean;
  createdAt: string;
}

const reportTypes = [
  { value: 'trial_balance', label: 'Trial Balance' },
  { value: 'general_ledger', label: 'General Ledger' },
  { value: 'vat_return', label: 'VAT Return' },
  { value: 'paye_return', label: 'PAYE Return' },
  { value: 'ar_aging', label: 'AR Aging' },
  { value: 'ap_aging', label: 'AP Aging' },
  { value: 'stock_status', label: 'Stock Status' },
];

const emptyForm = { name: '', type: 'trial_balance', isPublic: false };

const standardReports = [
  { name: 'Trial Balance', type: 'trial_balance', icon: BookOpen, desc: 'View trial balance report', color: 'text-mine-blue-800' },
  { name: 'General Ledger', type: 'general_ledger', icon: BookOpen, desc: 'View general ledger report', color: 'text-green-600' },
  { name: 'VAT Return', type: 'vat_return', icon: Receipt, desc: 'View VAT return report', color: 'text-amber-600' },
  { name: 'PAYE Return', type: 'paye_return', icon: Receipt, desc: 'View PAYE return report', color: 'text-red-600' },
  { name: 'AR Aging', type: 'ar_aging', icon: Users, desc: 'View accounts receivable aging', color: 'text-purple-600' },
  { name: 'AP Aging', type: 'ap_aging', icon: Users, desc: 'View accounts payable aging', color: 'text-indigo-600' },
  { name: 'Stock Status', type: 'stock_status', icon: Package, desc: 'View stock status report', color: 'text-teal-600' },
];

export default function ReportsPage() {
  const [data, setData] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<SavedReport | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('type', 'saved');
      if (search) params.set('reportType', search);
      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json.items ?? json);
    } catch (e) {
      console.error('Failed to fetch reports', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search]);

  const openCreate = () => {
    setEditingReport(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (report: SavedReport) => {
    setEditingReport(report);
    setForm({ name: report.name, type: report.type, isPublic: report.isPublic });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      let res;
      let tid;
      if (editingReport) {
        tid = toast('Updating report...', 'info', 120000);
        try {
          res = await fetch(`/api/reports/${editingReport.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });
        } catch (e) { dismissToast(tid); throw e; }
      } else {
        tid = toast('Saving report...', 'info', 120000);
        try {
          res = await fetch('/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });
        } catch (e) { dismissToast(tid); throw e; }
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to save report', 'error');
        return;
      }
      dismissToast(tid);
      toast((editingReport ? 'Report updated' : 'Report created') + ' successfully', 'success');
      setDialogOpen(false);
      setEditingReport(null);
      fetchData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({ title: 'Delete Report', message: 'Are you sure you want to delete this report?', variant: 'danger' }); if (!ok) return;
    try {
      const tid = toast('Deleting report...', 'info', 120000);
      let res;
      try {
        res = await fetch(`/api/reports/${id}`, { method: 'DELETE' });
      } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Delete failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to delete report', 'error');
        return;
      }
      dismissToast(tid);
      toast('Report deleted successfully', 'success');
      fetchData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  const runReport = async (type: string, name: string) => {
    try {
      const res = await fetch(`/api/reports/${type}/generate`, { method: 'POST' });
      if (!res.ok) {
        toast('Failed to generate report', 'error');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/\s+/g, '_').toLowerCase()}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reports</h2>
          <p className="text-slate-500 mt-1">Generate and manage reports</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Save Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Saved Reports</p>
            <p className="text-xl font-bold text-slate-900">{data.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Report Types</p>
            <p className="text-xl font-bold text-mine-blue-800">{reportTypes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Public Reports</p>
            <p className="text-xl font-bold text-green-600">{data.filter(r => r.isPublic).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">My Reports</p>
            <p className="text-xl font-bold text-amber-600">{data.filter(r => !r.isPublic).length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-mine-blue-800" />
            Standard Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {standardReports.map((rpt) => (
              <Card key={rpt.type} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => runReport(rpt.type, rpt.name)}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-50">
                    <rpt.icon className={`h-6 w-6 ${rpt.color}`} />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-slate-900">{rpt.name}</p>
                    <p className="text-xs text-slate-500">{rpt.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-mine-blue-800" />
              Saved Reports
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search reports..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.name}</TableCell>
                  <TableCell className="text-xs text-slate-600 capitalize">{report.type.replace(/_/g, ' ')}</TableCell>
                  <TableCell className="text-xs text-slate-600">{report.createdBy}</TableCell>
                  <TableCell>
                    <Badge variant={report.isPublic ? 'success' : 'secondary'}>{report.isPublic ? 'Public' : 'Private'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => runReport(report.type, report.name)} className="p-1.5 hover:bg-slate-100 rounded"><Eye className="h-4 w-4 text-slate-400" /></button>
                      <button onClick={() => openEdit(report)} className="p-1.5 hover:bg-slate-100 rounded"><Edit2 className="h-4 w-4 text-slate-400" /></button>
                      <button onClick={() => handleDelete(report.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-red-400" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditingReport(null); }} title={editingReport ? 'Edit Saved Report' : 'Save Report'}>
        <div className="space-y-4">
          <Input label="Report Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Monthly VAT Summary" />
          <Select label="Report Type" options={reportTypes} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
          <Checkbox label="Make Public" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingReport(null); }}>Cancel</Button>
          <Button onClick={handleSave}>{editingReport ? 'Update' : 'Save'}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

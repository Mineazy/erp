'use client';

import { toast, dismissToast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Target, Plus, Search, Edit2, Trash2, TrendingUp, DollarSign, Users } from 'lucide-react';

interface Lead {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  source: string;
  stage: string;
  value: number;
  probability: number;
  assignedTo: string;
  expectedCloseDate: string;
  notes: string;
  createdAt: string;
}

const emptyForm = {
  companyName: '', contactName: '', email: '', phone: '',
  source: 'referral', stage: 'new', value: 0, probability: 10,
  assignedTo: '', expectedCloseDate: '', notes: '',
};

const stageColors: Record<string, string> = {
  new: 'bg-slate-50 text-slate-700',
  contacted: 'bg-blue-50 text-blue-700',
  qualified: 'bg-indigo-50 text-indigo-700',
  proposal: 'bg-purple-50 text-purple-700',
  negotiation: 'bg-amber-50 text-amber-700',
  won: 'bg-green-50 text-green-700',
  lost: 'bg-red-50 text-red-700',
};

const stageOptions = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

const sourceOptions = [
  { value: 'referral', label: 'Referral' },
  { value: 'website', label: 'Website' },
  { value: 'cold_call', label: 'Cold Call' },
  { value: 'email', label: 'Email Campaign' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'trade_show', label: 'Trade Show' },
  { value: 'other', label: 'Other' },
];

export default function LeadsPage() {
  const [data, setData] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (stageFilter) params.set('stage', stageFilter);
      const res = await fetch(`/api/crm/leads?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch leads', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search, stageFilter]);

  const openCreate = () => {
    setEditingLead(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setForm({
      companyName: lead.companyName, contactName: lead.contactName,
      email: lead.email, phone: lead.phone, source: lead.source,
      stage: lead.stage, value: lead.value, probability: lead.probability,
      assignedTo: lead.assignedTo, expectedCloseDate: lead.expectedCloseDate,
      notes: lead.notes,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      let res;
      let tid;
      if (editingLead) {
        tid = toast('Updating lead...', 'info', 120000);
        try {
          res = await fetch(`/api/crm/leads/${editingLead.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });
        } catch (e) { dismissToast(tid); throw e; }
      } else {
        tid = toast('Saving lead...', 'info', 120000);
        try {
          res = await fetch('/api/crm/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });
        } catch (e) { dismissToast(tid); throw e; }
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to save lead', 'error');
        return;
      }
      dismissToast(tid);
      toast((editingLead ? 'Lead updated' : 'Lead created') + ' successfully', 'success');
      setDialogOpen(false);
      setEditingLead(null);
      fetchData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({ title: 'Delete Lead', message: 'Are you sure you want to delete this lead?', variant: 'danger' }); if (!ok) return;
    try {
      const tid = toast('Deleting lead...', 'info', 120000);
      let res;
      try {
        res = await fetch(`/api/crm/leads/${id}`, { method: 'DELETE' });
      } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Delete failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to delete lead', 'error');
        return;
      }
      dismissToast(tid);
      toast('Lead deleted successfully', 'success');
      fetchData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  const wonLeads = data.filter(l => l.stage === 'won');
  const wonValue = wonLeads.reduce((s, l) => s + l.value, 0);
  const pipelineValue = data
    .filter(l => l.stage !== 'won' && l.stage !== 'lost')
    .reduce((s, l) => s + (l.value * l.probability / 100), 0);

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Leads & Opportunities</h2>
          <p className="text-slate-500 mt-1">Manage your sales pipeline and track opportunities</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            options={[{ value: '', label: 'All Stages' }, ...stageOptions]}
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="w-40"
          />
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-mine-blue-800" />
              <div>
                <p className="text-sm text-slate-500">Total Leads</p>
                <p className="text-xl font-bold text-slate-900">{data.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-slate-500">Won Value</p>
                <p className="text-xl font-bold text-green-600">${wonValue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-sm text-slate-500">Pipeline Value</p>
                <p className="text-xl font-bold text-amber-600">${pipelineValue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-slate-500">Active Deals</p>
                <p className="text-xl font-bold text-blue-600">{data.filter(l => l.stage !== 'won' && l.stage !== 'lost').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-mine-blue-800" />
              Lead List
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-center">Probability</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Close Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.companyName}</TableCell>
                  <TableCell className="text-xs text-slate-600">{lead.contactName}</TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${stageColors[lead.stage] || 'bg-slate-50 text-slate-700'}`}>
                      {lead.stage}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">${lead.value.toLocaleString()}</TableCell>
                  <TableCell className="text-center">
                    <span className="font-mono text-xs">{lead.probability}%</span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">{lead.assignedTo}</TableCell>
                  <TableCell className="font-mono text-xs">{lead.expectedCloseDate || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(lead)} className="p-1.5 hover:bg-slate-100 rounded"><Edit2 className="h-4 w-4 text-slate-400" /></button>
                      <button onClick={() => handleDelete(lead.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-red-400" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditingLead(null); }} title={editingLead ? 'Edit Lead' : 'Add Lead'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Company Name" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="e.g. ABC Corp" />
            <Input label="Contact Name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} placeholder="Full name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@company.com" />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+263 71 234 5678" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Source" options={sourceOptions} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
            <Select label="Stage" options={stageOptions} value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Value ($)" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} placeholder="0.00" />
            <Input label="Probability (%)" type="number" value={form.probability} onChange={(e) => setForm({ ...form, probability: Number(e.target.value) })} placeholder="10" min={0} max={100} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Assigned To" value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} placeholder="Sales person name" />
            <Input label="Expected Close Date" type="date" value={form.expectedCloseDate} onChange={(e) => setForm({ ...form, expectedCloseDate: e.target.value })} />
          </div>
          <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingLead(null); }}>Cancel</Button>
          <Button onClick={handleSave}>{editingLead ? 'Update' : 'Create'}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

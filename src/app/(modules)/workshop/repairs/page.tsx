'use client';

import { toast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Wrench, Plus, Search, AlertTriangle, Clock, CheckCircle2, Package, DollarSign, User, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface RepairJobCard {
  id: string;
  jobCardNumber: string;
  branch: { name: string };
  customerName: string;
  productName: string;
  status: string;
  priority: string;
  repairCost?: string | null;
  replacementCost?: string | null;
  receivedDate?: string | null;
  targetDate?: string | null;
  createdAt: string;
  activities: Array<{ id: string; createdAt: string }>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: 'Open', color: 'text-blue-700', bg: 'bg-blue-50' },
  troubleshooting: { label: 'Troubleshooting', color: 'text-indigo-700', bg: 'bg-indigo-50' },
  quoted: { label: 'Quoted', color: 'text-orange-700', bg: 'bg-orange-50' },
  paid: { label: 'Paid', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  in_repair: { label: 'In Repair', color: 'text-purple-700', bg: 'bg-purple-50' },
  repaired: { label: 'Repaired', color: 'text-teal-700', bg: 'bg-teal-50' },
  beyond_repair: { label: 'Beyond Repair', color: 'text-red-700', bg: 'bg-red-50' },
  replacement_quoted: { label: 'Replacement Quoted', color: 'text-amber-700', bg: 'bg-amber-50' },
  replacement_sent: { label: 'Replacement Sent', color: 'text-cyan-700', bg: 'bg-cyan-50' },
  dispatched: { label: 'Dispatched', color: 'text-green-700', bg: 'bg-green-50' },
  completed: { label: 'Completed', color: 'text-slate-700', bg: 'bg-slate-100' },
  cancelled: { label: 'Cancelled', color: 'text-slate-500', bg: 'bg-slate-50' },
};

export default function RepairsPage() {
  const [data, setData] = useState<RepairJobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    branchId: '', customerName: '', customerContact: '', productName: '',
    serialNumber: '', faultDescription: '', priority: 'medium', receivedDate: '', notes: '',
  });
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/workshop/repairs?${params}`);
      if (res.ok) setData(await res.json());
    } catch { toast('Failed to load repairs', 'error'); }
    finally { setLoading(false); }
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/admin/branches');
      if (res.ok) setBranches(await res.json());
    } catch {}
  };

  useEffect(() => { fetchData(); }, [search, statusFilter]);
  useEffect(() => { fetchBranches(); }, []);

  const handleCreate = async () => {
    if (!form.branchId || !form.customerName || !form.productName || !form.faultDescription) {
      toast('Branch, customer, product, and fault description are required', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/workshop/repairs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      toast('Job card created', 'success');
      setDialogOpen(false);
      setForm({ branchId: '', customerName: '', customerContact: '', productName: '', serialNumber: '', faultDescription: '', priority: 'medium', receivedDate: '', notes: '' });
      fetchData();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setIsSubmitting(false); }
  };

  const getStatusBadge = (status: string) => {
    const cfg = STATUS_CONFIG[status] || { label: status, color: 'text-slate-600', bg: 'bg-slate-50' };
    return <Badge variant="outline" className={`${cfg.bg} ${cfg.color} border-current`}>{cfg.label}</Badge>;
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'urgent': return <Badge className="bg-red-100 text-red-800">Urgent</Badge>;
      case 'high': return <Badge className="bg-orange-100 text-orange-800">High</Badge>;
      case 'medium': return <Badge className="bg-blue-100 text-blue-700">Medium</Badge>;
      case 'low': return <Badge className="bg-slate-100 text-slate-600">Low</Badge>;
      default: return <Badge variant="secondary">{p}</Badge>;
    }
  };

  const kpis = {
    total: data.length,
    open: data.filter(d => ['open', 'troubleshooting'].includes(d.status)).length,
    inProgress: data.filter(d => ['quoted', 'paid', 'in_repair'].includes(d.status)).length,
    beyondRepair: data.filter(d => ['beyond_repair', 'replacement_quoted', 'replacement_sent'].includes(d.status)).length,
    completed: data.filter(d => ['completed', 'dispatched'].includes(d.status)).length,
  };

  if (loading && data.length === 0) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Returned Equipment Repairs</h2>
          <p className="text-slate-500 mt-1">Track and manage customer equipment returned for repair through branches</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Open Job Card
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Jobs', value: kpis.total, icon: Wrench, color: 'text-slate-700' },
          { label: 'Open / Troubleshooting', value: kpis.open, icon: AlertTriangle, color: 'text-blue-700' },
          { label: 'In Progress', value: kpis.inProgress, icon: Clock, color: 'text-purple-700' },
          { label: 'Beyond Repair', value: kpis.beyondRepair, icon: Package, color: 'text-red-700' },
          { label: 'Completed', value: kpis.completed, icon: CheckCircle2, color: 'text-emerald-700' },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-slate-50`}><kpi.icon className={`h-5 w-5 ${kpi.color}`} /></div>
              <div><p className="text-2xl font-bold">{kpi.value}</p><p className="text-xs text-slate-500">{kpi.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wrench className="h-5 w-5 text-rose-600" />Job Cards
            </CardTitle>
            <div className="flex items-center gap-3">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white">
                <option value="">All Statuses</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 w-64" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Card #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Repair Cost</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-slate-500 py-8">No repair job cards found</TableCell></TableRow>
              ) : data.map(card => (
                <TableRow key={card.id}>
                  <TableCell className="font-mono text-xs font-medium">{card.jobCardNumber}</TableCell>
                  <TableCell>
                    <p className="font-medium text-sm">{card.customerName}</p>
                  </TableCell>
                  <TableCell className="text-sm">{card.productName}</TableCell>
                  <TableCell className="text-sm">{card.branch?.name}</TableCell>
                  <TableCell>{getPriorityBadge(card.priority)}</TableCell>
                  <TableCell>{getStatusBadge(card.status)}</TableCell>
                  <TableCell className="text-sm font-mono">{card.repairCost ? `$${Number(card.repairCost).toLocaleString()}` : '—'}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/workshop/repairs/${card.id}`}>
                      <Button variant="outline" size="sm"><ArrowRight className="h-4 w-4" /></Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onClose={() => !isSubmitting && setDialogOpen(false)} title="Open Repair Job Card" size="2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Branch *</Label>
              <select value={form.branchId} onChange={e => setForm({ ...form, branchId: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg mt-1">
                <option value="">Select branch</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Date Received *</Label>
              <Input type="date" value={form.receivedDate} onChange={e => setForm({ ...form, receivedDate: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Priority</Label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg mt-1">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Customer Name *</Label>
              <Input value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Customer Contact</Label>
              <Input value={form.customerContact} onChange={e => setForm({ ...form, customerContact: e.target.value })} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Product Name *</Label>
              <Input value={form.productName} onChange={e => setForm({ ...form, productName: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Serial Number</Label>
              <Input value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Fault Description *</Label>
            <textarea value={form.faultDescription} onChange={e => setForm({ ...form, faultDescription: e.target.value })} rows={3} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg mt-1" />
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleCreate} disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Open Job Card'}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

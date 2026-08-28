'use client';

import { toast, dismissToast } from '@/components/ui/toast';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Wrench, AlertTriangle, Clock, CheckCircle2, Package, Send, User, DollarSign, Truck, Ban, Shield, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const STATUSES = [
  { key: 'open', label: 'Open', icon: Wrench, color: 'blue' },
  { key: 'troubleshooting', label: 'Troubleshooting', icon: AlertTriangle, color: 'indigo' },
  { key: 'quoted', label: 'Quoted', icon: DollarSign, color: 'orange' },
  { key: 'paid', label: 'Paid', icon: CheckCircle2, color: 'emerald' },
  { key: 'in_repair', label: 'In Repair', icon: Wrench, color: 'purple' },
  { key: 'repaired', label: 'Repaired', icon: CheckCircle2, color: 'teal' },
  { key: 'dispatched', label: 'Dispatched', icon: Send, color: 'cyan' },
  { key: 'completed', label: 'Completed', icon: CheckCircle2, color: 'slate' },
];

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

interface Activity {
  id: string;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  performedBy: string;
  notes?: string | null;
  createdAt: string;
}

interface JobCard {
  id: string;
  jobCardNumber: string;
  branch: { name: string; id: string };
  customerName: string;
  customerContact?: string | null;
  productName: string;
  productCode?: string | null;
  serialNumber?: string | null;
  faultDescription: string;
  diagnosisNotes?: string | null;
  repairCost?: string | null;
  replacementCost?: string | null;
  status: string;
  priority: string;
  assignedTechnician?: string | null;
  receivedDate?: string | null;
  targetDate?: string | null;
  completedDate?: string | null;
  dispatchDate?: string | null;
  paymentRef?: string | null;
  replacementProductId?: string | null;
  replacementProductName?: string | null;
  notes?: string | null;
  createdAt: string;
  activities: Activity[];
}

export default function RepairDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [card, setCard] = useState<JobCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [diagnosisForm, setDiagnosisForm] = useState({ diagnosisNotes: '', repairCost: '', replacementCost: '' });
  const [paymentRef, setPaymentRef] = useState('');
  const [replacementForm, setReplacementForm] = useState({ replacementProductName: '', replacementProductId: '', replacementCost: '' });
  const [generalNote, setGeneralNote] = useState('');

  const fetchCard = async () => {
    try {
      const res = await fetch(`/api/workshop/repairs/${id}`);
      if (res.ok) setCard(await res.json());
      else toast('Failed to load job card', 'error');
    } catch { toast('Network error', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCard(); }, [id]);

  useEffect(() => {
    if (card) {
      setDiagnosisForm({
        diagnosisNotes: card.diagnosisNotes || '',
        repairCost: card.repairCost || '',
        replacementCost: card.replacementCost || '',
      });
    }
  }, [card?.id]);

  const advanceStatus = async (toStatus: string, extra?: any) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/workshop/repairs/${id}/action`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'advance_status', toStatus, notes: generalNote, ...extra }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      toast(`Status changed to ${STATUS_CONFIG[toStatus]?.label || toStatus}`, 'success');
      setGeneralNote('');
      fetchCard();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setIsSubmitting(false); }
  };

  const submitDiagnosis = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/workshop/repairs/${id}/action`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit_diagnosis', ...diagnosisForm }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      toast('Diagnosis submitted and quote sent to customer', 'success');
      fetchCard();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setIsSubmitting(false); }
  };

  const markBeyondRepair = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/workshop/repairs/${id}/action`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_beyond_repair', diagnosisNotes: diagnosisForm.diagnosisNotes, replacementCost: diagnosisForm.replacementCost, notes: generalNote }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      toast('Equipment marked as beyond repair', 'success');
      setGeneralNote('');
      fetchCard();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setIsSubmitting(false); }
  };

  const recordPayment = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/workshop/repairs/${id}/action`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'record_payment', paymentRef, notes: generalNote }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      toast('Payment recorded', 'success');
      setPaymentRef('');
      setGeneralNote('');
      fetchCard();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setIsSubmitting(false); }
  };

  const quoteReplacement = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/workshop/repairs/${id}/action`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'quote_replacement', ...replacementForm, notes: generalNote }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      toast('Replacement quoted', 'success');
      setGeneralNote('');
      fetchCard();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setIsSubmitting(false); }
  };

  const dispatchReplacement = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/workshop/repairs/${id}/action`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dispatch_replacement', notes: generalNote }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      toast('Replacement dispatched to branch', 'success');
      setGeneralNote('');
      fetchCard();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setIsSubmitting(false); }
  };

  const statusInfo = (key: string) => STATUSES.find(s => s.key === key);
  const currentStatusIdx = STATUSES.findIndex(s => s.key === card?.status);

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;
  if (!card) return <div className="p-6">Job card not found.</div>;

  const isBeyondRepairFlow = ['beyond_repair', 'replacement_quoted', 'replacement_sent'].includes(card.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/workshop/repairs')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{card.jobCardNumber}</h2>
            <p className="text-slate-500 mt-1">{card.branch.name} — {card.customerName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={
            card.priority === 'urgent' ? 'bg-red-100 text-red-800' :
            card.priority === 'high' ? 'bg-orange-100 text-orange-800' :
            'bg-slate-100 text-slate-700'
          }>{card.priority}</Badge>
          <Badge className={`${STATUS_CONFIG[card.status]?.bg || 'bg-slate-50'} ${STATUS_CONFIG[card.status]?.color || 'text-slate-600'} border-current`} variant="outline">
            {STATUS_CONFIG[card.status]?.label || card.status}
          </Badge>
        </div>
      </div>

      {/* Status Pipeline */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between overflow-x-auto">
            {STATUSES.map((st, i) => {
              const Icon = st.icon;
              const isActive = card.status === st.key;
              const isPast = i < currentStatusIdx;
              const isBeyondPath = isBeyondRepairFlow && ['beyond_repair', 'replacement_quoted', 'replacement_sent'].includes(st.key);
              return (
                <div key={st.key} className="flex items-center">
                  <div className={`flex flex-col items-center gap-1 ${isActive ? 'text-blue-700' : isPast || isBeyondPath ? 'text-emerald-600' : 'text-slate-400'}`}>
                    <div className={`p-2 rounded-full ${isActive ? 'bg-blue-100 ring-2 ring-blue-500' : isPast || isBeyondPath ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-medium whitespace-nowrap">{st.label}</span>
                  </div>
                  {i < STATUSES.length - 1 && (
                    <div className={`w-6 h-0.5 mx-1 ${i < currentStatusIdx || isBeyondPath ? 'bg-emerald-400' : i === currentStatusIdx ? 'bg-blue-400' : 'bg-slate-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Action Panel */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-blue-800">Actions — {STATUS_CONFIG[card.status]?.label || card.status}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* OPEN → Troubleshooting */}
              {card.status === 'open' && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">Begin troubleshooting the returned equipment.</p>
                  <div>
                    <Label className="text-xs">Assign Technician</Label>
                    <Input value={card.assignedTechnician || ''} onChange={e => setCard({ ...card!, assignedTechnician: e.target.value })} placeholder="Technician name" className="mt-1" />
                  </div>
                  <Button size="sm" onClick={() => advanceStatus('troubleshooting', { assignedTechnician: card.assignedTechnician })} disabled={isSubmitting}>
                    <Wrench className="h-4 w-4 mr-1" /> Start Troubleshooting
                  </Button>
                </div>
              )}

              {/* TROUBLESHOOTING → Quote or Beyond Repair */}
              {card.status === 'troubleshooting' && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">Document diagnosis and provide cost estimate to customer.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Diagnosis Notes *</Label>
                      <textarea value={diagnosisForm.diagnosisNotes} onChange={e => setDiagnosisForm({ ...diagnosisForm, diagnosisNotes: e.target.value })} rows={3} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg mt-1" placeholder="Describe the issue found..." />
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Repair Cost ($)</Label>
                        <Input type="number" step="0.01" value={diagnosisForm.repairCost} onChange={e => setDiagnosisForm({ ...diagnosisForm, repairCost: e.target.value })} className="mt-1" placeholder="0.00" />
                      </div>
                      <div>
                        <Label className="text-xs">Replacement Cost ($) — if beyond repair</Label>
                        <Input type="number" step="0.01" value={diagnosisForm.replacementCost} onChange={e => setDiagnosisForm({ ...diagnosisForm, replacementCost: e.target.value })} className="mt-1" placeholder="0.00" />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={submitDiagnosis} disabled={isSubmitting || !diagnosisForm.diagnosisNotes}>
                      <DollarSign className="h-4 w-4 mr-1" /> Submit Diagnosis & Quote
                    </Button>
                    <Button size="sm" variant="destructive" onClick={markBeyondRepair} disabled={isSubmitting}>
                      <Ban className="h-4 w-4 mr-1" /> Mark Beyond Repair
                    </Button>
                  </div>
                </div>
              )}

              {/* QUOTED → Wait for payment */}
              {card.status === 'quoted' && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">Quote sent to customer. Record payment when received.</p>
                  <div className="bg-white border rounded-lg p-3 space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-slate-500">Repair Cost:</span><span className="font-bold text-lg">${card.repairCost ? Number(card.repairCost).toLocaleString() : '0'}</span></div>
                    {card.replacementCost && <div className="flex justify-between text-sm"><span className="text-slate-500">Replacement Cost:</span><span className="font-medium">${Number(card.replacementCost).toLocaleString()}</span></div>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Payment Reference</Label>
                      <Input value={paymentRef} onChange={e => setPaymentRef(e.target.value)} placeholder="Receipt/ref number" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Note</Label>
                      <Input value={generalNote} onChange={e => setGeneralNote(e.target.value)} placeholder="Optional note" className="mt-1" />
                    </div>
                  </div>
                  <Button size="sm" onClick={recordPayment} disabled={isSubmitting}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Record Payment
                  </Button>
                </div>
              )}

              {/* PAID → Start repair */}
              {card.status === 'paid' && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">Payment confirmed. Begin repair work.</p>
                  <Button size="sm" onClick={() => advanceStatus('in_repair')} disabled={isSubmitting}>
                    <Wrench className="h-4 w-4 mr-1" /> Start Repair
                  </Button>
                </div>
              )}

              {/* IN_REPAIR → Repair complete */}
              {card.status === 'in_repair' && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">Repair work completed. Mark as repaired and ready for dispatch.</p>
                  <Button size="sm" onClick={() => advanceStatus('repaired')} disabled={isSubmitting}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Mark Repaired
                  </Button>
                </div>
              )}

              {/* REPAIRED → Dispatch */}
              {card.status === 'repaired' && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">Equipment repaired. Dispatch back to customer via branch.</p>
                  <Button size="sm" onClick={() => advanceStatus('dispatched')} disabled={isSubmitting}>
                    <Send className="h-4 w-4 mr-1" /> Dispatch to Branch
                  </Button>
                </div>
              )}

              {/* DISPATCHED → Complete */}
              {card.status === 'dispatched' && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">Equipment dispatched. Close job card when customer confirms receipt.</p>
                  <Button size="sm" onClick={() => advanceStatus('completed')} disabled={isSubmitting}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Close Job Card
                  </Button>
                </div>
              )}

              {/* BEYOND REPAIR → Quote replacement */}
              {card.status === 'beyond_repair' && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">Equipment is beyond repair. Quote a replacement for the customer.</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Replacement Product</Label>
                      <Input value={replacementForm.replacementProductName} onChange={e => setReplacementForm({ ...replacementForm, replacementProductName: e.target.value })} className="mt-1" placeholder="Product name" />
                    </div>
                    <div>
                      <Label className="text-xs">Product Code</Label>
                      <Input value={replacementForm.replacementProductId} onChange={e => setReplacementForm({ ...replacementForm, replacementProductId: e.target.value })} className="mt-1" placeholder="Code" />
                    </div>
                    <div>
                      <Label className="text-xs">Replacement Cost ($)</Label>
                      <Input type="number" step="0.01" value={replacementForm.replacementCost} onChange={e => setReplacementForm({ ...replacementForm, replacementCost: e.target.value })} className="mt-1" />
                    </div>
                  </div>
                  <Button size="sm" onClick={quoteReplacement} disabled={isSubmitting}>
                    <DollarSign className="h-4 w-4 mr-1" /> Quote Replacement
                  </Button>
                </div>
              )}

              {/* REPLACEMENT_QUOTED → Dispatch replacement */}
              {card.status === 'replacement_quoted' && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">Replacement quoted. Dispatch replacement to branch once approved.</p>
                  <div className="bg-white border rounded-lg p-3 space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-slate-500">Replacement:</span><span className="font-medium">{card.replacementProductName || 'N/A'}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-500">Cost:</span><span className="font-bold">${card.replacementCost ? Number(card.replacementCost).toLocaleString() : '0'}</span></div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={dispatchReplacement} disabled={isSubmitting}>
                      <Truck className="h-4 w-4 mr-1" /> Dispatch Replacement
                    </Button>
                    <Button size="sm" variant="outline" onClick={recordPayment} disabled={isSubmitting}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Record Payment
                    </Button>
                  </div>
                </div>
              )}

              {/* REPLACEMENT_SENT → Dispatch to customer */}
              {card.status === 'replacement_sent' && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">Replacement dispatched. Close job card when customer confirms receipt.</p>
                  <Button size="sm" onClick={() => advanceStatus('dispatched')} disabled={isSubmitting}>
                    <Send className="h-4 w-4 mr-1" /> Mark Dispatched
                  </Button>
                </div>
              )}

              {card.status === 'completed' && (
                <p className="text-sm text-slate-500">This job card is closed.</p>
              )}
            </CardContent>
          </Card>

          {/* Equipment Details */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Equipment Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-slate-500">Product:</span><p className="font-medium mt-0.5">{card.productName}</p></div>
                <div><span className="text-slate-500">Product Code:</span><p className="mt-0.5">{card.productCode || '—'}</p></div>
                <div><span className="text-slate-500">Serial Number:</span><p className="mt-0.5 font-mono">{card.serialNumber || '—'}</p></div>
              </div>
              <div>
                <span className="text-slate-500 text-sm">Fault Description:</span>
                <p className="text-sm mt-1 bg-slate-50 p-3 rounded border">{card.faultDescription}</p>
              </div>
              {card.diagnosisNotes && (
                <div>
                  <span className="text-slate-500 text-sm">Diagnosis Notes:</span>
                  <p className="text-sm mt-1 bg-indigo-50 p-3 rounded border border-indigo-200">{card.diagnosisNotes}</p>
                </div>
              )}
              {card.replacementProductName && (
                <div className="bg-amber-50 border border-amber-200 rounded p-3">
                  <p className="text-sm font-medium text-amber-800">Replacement: {card.replacementProductName} ({card.replacementProductId || 'N/A'}) — ${card.replacementCost ? Number(card.replacementCost).toLocaleString() : '0'}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Job Info */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Job Card Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Branch</span><span className="font-medium">{card.branch.name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Customer</span><span className="font-medium">{card.customerName}</span></div>
              {card.customerContact && <div className="flex justify-between"><span className="text-slate-500">Contact</span><span>{card.customerContact}</span></div>}
              <div className="flex justify-between"><span className="text-slate-500">Technician</span><span>{card.assignedTechnician || 'Unassigned'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Received</span><span>{card.receivedDate ? new Date(card.receivedDate).toLocaleDateString() : '—'}</span></div>
              {card.targetDate && <div className="flex justify-between"><span className="text-slate-500">Target</span><span className={new Date(card.targetDate) < new Date() ? 'text-red-600 font-medium' : ''}>{new Date(card.targetDate).toLocaleDateString()}</span></div>}
              {card.completedDate && <div className="flex justify-between"><span className="text-slate-500">Completed</span><span>{new Date(card.completedDate).toLocaleDateString()}</span></div>}
              {card.dispatchDate && <div className="flex justify-between"><span className="text-slate-500">Dispatched</span><span>{new Date(card.dispatchDate).toLocaleDateString()}</span></div>}
              {card.paymentRef && <div className="flex justify-between"><span className="text-slate-500">Payment Ref</span><span className="font-mono text-xs">{card.paymentRef}</span></div>}
              {card.notes && <div><span className="text-slate-500">Notes:</span><p className="mt-1 text-xs bg-slate-50 p-2 rounded">{card.notes}</p></div>}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Activity Timeline ({card.activities.length})</CardTitle></CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
              {card.activities.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No activity yet</p>
              ) : card.activities.map(act => (
                <div key={act.id} className="border-l-2 border-slate-200 pl-3 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-700">{act.action.replace(/_/g, ' ')}</span>
                    {act.fromStatus && act.toStatus && (
                      <span className="text-[10px] text-slate-400">
                        {STATUS_CONFIG[act.fromStatus]?.label || act.fromStatus} → {STATUS_CONFIG[act.toStatus]?.label || act.toStatus}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    <User className="h-3 w-3 inline mr-1" />{act.performedBy} · {new Date(act.createdAt).toLocaleString()}
                  </p>
                  {act.notes && <p className="text-xs text-slate-500 mt-1 bg-slate-50 p-1.5 rounded">{act.notes}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

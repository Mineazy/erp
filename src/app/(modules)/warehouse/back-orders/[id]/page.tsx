'use client';

import { toast, dismissToast } from '@/components/ui/toast';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ArrowLeft, CheckCircle2, Package, Truck, ShoppingCart, ClipboardCheck, Warehouse, Send, Clock, AlertTriangle, User, FileText } from 'lucide-react';
import Link from 'next/link';

const STAGES = [
  { key: 'submitted', label: 'Submitted', icon: Send, color: 'blue' },
  { key: 'warehouse_review', label: 'Warehouse Review', icon: Warehouse, color: 'indigo' },
  { key: 'procurement_needed', label: 'Procurement Needed', icon: AlertTriangle, color: 'amber' },
  { key: 'requisition_created', label: 'Requisition Created', icon: ClipboardCheck, color: 'orange' },
  { key: 'po_created', label: 'PO Issued', icon: ShoppingCart, color: 'purple' },
  { key: 'goods_received', label: 'Goods Received', icon: Truck, color: 'teal' },
  { key: 'allocation', label: 'Ready to Allocate', icon: Package, color: 'emerald' },
  { key: 'dispatched', label: 'Dispatched', icon: Send, color: 'cyan' },
  { key: 'closed', label: 'Closed', icon: CheckCircle2, color: 'slate' },
];

const NEXT_STAGES: Record<string, string[]> = {
  submitted: ['warehouse_review'],
  warehouse_review: ['procurement_needed', 'allocation'],
  procurement_needed: ['requisition_created'],
  requisition_created: ['po_created'],
  po_created: ['goods_received'],
  goods_received: ['allocation'],
  allocation: ['dispatched'],
  dispatched: ['closed'],
};

interface BackOrderLine {
  id: string;
  productId: string;
  productName: string;
  requestedQty: string;
  allocatedQty: string;
  outstandingQty: string;
  purchasedQty: string;
  receivedQty: string;
  availableStock: number;
  status: string;
  notes?: string | null;
}

interface Activity {
  id: string;
  action: string;
  fromStage?: string | null;
  toStage?: string | null;
  performedBy: string;
  notes?: string | null;
  refType?: string | null;
  refId?: string | null;
  createdAt: string;
}

interface BackOrder {
  id: string;
  orderNumber: string;
  branch: { name: string; id: string };
  status: string;
  stage: string;
  createdAt: string;
  requestedBy: string;
  customerName?: string | null;
  customerRef?: string | null;
  urgency: string;
  targetDate?: string | null;
  notes?: string | null;
  lines: BackOrderLine[];
  activities: Activity[];
}

export default function ReviewBackOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [order, setOrder] = useState<BackOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [fulfillLines, setFulfillLines] = useState<Record<string, number>>({});
  const [receiveLines, setReceiveLines] = useState<Record<string, number>>({});
  const [requisitionNote, setRequisitionNote] = useState('');
  const [poNote, setPoNote] = useState('');
  const [generalNote, setGeneralNote] = useState('');

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/warehouse/back-orders/${id}`);
      if (res.ok) setOrder(await res.json());
      else toast('Failed to load back order', 'error');
    } catch { toast('Network error', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrder(); }, [id]);

  useEffect(() => {
    if (order) {
      const initial: Record<string, number> = {};
      const initialReceive: Record<string, number> = {};
      order.lines.forEach((l) => {
        initial[l.id] = Math.min(Number(l.outstandingQty), l.availableStock);
        initialReceive[l.id] = 0;
      });
      setFulfillLines(initial);
      setReceiveLines(initialReceive);
    }
  }, [order?.id]);

  const advanceStage = async (toStage: string, note?: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/warehouse/back-orders/${id}/fulfill`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'advance_stage', toStage, notes: note || generalNote }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      toast(`Stage advanced to ${STAGES.find(s => s.key === toStage)?.label}`, 'success');
      setGeneralNote('');
      fetchOrder();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setIsSubmitting(false); }
  };

  const requestProcurement = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/warehouse/back-orders/${id}/fulfill`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_procurement', notes: generalNote }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      toast('Procurement request sent to Purchasing team', 'success');
      setGeneralNote('');
      fetchOrder();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setIsSubmitting(false); }
  };

  const createRequisition = async () => {
    if (!order) return;
    setIsSubmitting(true);
    const tid = toast('Creating purchase requisition...', 'info', 120000);
    try {
      const items = order.lines
        .filter(l => Number(l.outstandingQty) > 0)
        .map(l => ({ productId: l.productId, productName: l.productName, quantity: String(Number(l.outstandingQty)), estimatedCost: '0' }));
      const res = await fetch('/api/purchasing/requisitions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: 'Warehouse',
          requiredDate: order.targetDate || new Date().toISOString(),
          notes: `Back Order ${order.orderNumber} - ${requisitionNote}`,
          branchId: order.branch.id,
          items,
        }),
      });
      dismissToast(tid);
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      const req = await res.json();
      await fetch(`/api/warehouse/back-orders/${id}/fulfill`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_requisition', notes: `Requisition ${req.requisitionNo} created`, items: [{ requisitionId: req.id }] }),
      });
      toast(`Requisition ${req.requisitionNo} created`, 'success');
      setRequisitionNote('');
      fetchOrder();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { dismissToast(tid); setIsSubmitting(false); }
  };

  const receiveGoods = async () => {
    if (!order) return;
    setIsSubmitting(true);
    try {
      const items = Object.entries(receiveLines)
        .filter(([_, qty]) => qty > 0)
        .map(([lineId, receivedQty]) => ({ lineId, receivedQty: String(receivedQty) }));
      if (items.length === 0) { toast('No quantities to receive', 'error'); setIsSubmitting(false); return; }
      const res = await fetch(`/api/warehouse/back-orders/${id}/fulfill`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'receive_goods', items, notes: generalNote }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      toast('Goods received and recorded', 'success');
      setReceiveLines({});
      setGeneralNote('');
      fetchOrder();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setIsSubmitting(false); }
  };

  const handleFulfill = async () => {
    if (!order) return;
    setIsSubmitting(true);
    try {
      const payload = Object.keys(fulfillLines)
        .map(lineId => ({ lineId, fulfillQty: fulfillLines[lineId] }))
        .filter(l => l.fulfillQty > 0);
      if (payload.length === 0) { toast('No quantities specified', 'error'); setIsSubmitting(false); return; }
      const res = await fetch(`/api/warehouse/back-orders/${id}/fulfill`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'advance_stage', toStage: 'dispatched', notes: 'Fulfillment from DC stock' }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      const fulfillRes = await fetch(`/api/warehouse/back-orders/${id}/fulfill`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines: payload }),
      });
      toast('Back order fulfilled. Stock transfer generated.', 'success');
      router.push('/warehouse/back-orders');
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setIsSubmitting(false); }
  };

  const stageInfo = (key: string) => STAGES.find(s => s.key === key);
  const currentStageIdx = STAGES.findIndex(s => s.key === order?.stage);

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;
  if (!order) return <div className="p-6">Back order not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/warehouse/back-orders')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{order.orderNumber}</h2>
            <p className="text-slate-500 mt-1">{order.branch.name} {order.customerName ? `— ${order.customerName}` : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={
            order.urgency === 'urgent' ? 'bg-red-100 text-red-800' :
            order.urgency === 'high' ? 'bg-orange-100 text-orange-800' :
            'bg-slate-100 text-slate-700'
          }>{order.urgency}</Badge>
          <Badge className={
            order.status === 'closed' ? 'bg-slate-100 text-slate-700' :
            order.status === 'allocated' ? 'bg-emerald-100 text-emerald-800' :
            order.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
            'bg-amber-100 text-amber-800'
          }>{order.status.replace(/_/g, ' ')}</Badge>
        </div>
      </div>

      {/* Stage Pipeline */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between overflow-x-auto">
            {STAGES.map((stage, i) => {
              const Icon = stage.icon;
              const isActive = order.stage === stage.key;
              const isPast = i < currentStageIdx;
              return (
                <div key={stage.key} className="flex items-center">
                  <div className={`flex flex-col items-center gap-1 ${isActive ? 'text-blue-700' : isPast ? 'text-emerald-600' : 'text-slate-400'}`}>
                    <div className={`p-2 rounded-full ${isActive ? 'bg-blue-100 ring-2 ring-blue-500' : isPast ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-medium whitespace-nowrap">{stage.label}</span>
                  </div>
                  {i < STAGES.length - 1 && (
                    <div className={`w-6 h-0.5 mx-1 ${i < currentStageIdx ? 'bg-emerald-400' : i === currentStageIdx ? 'bg-blue-400' : 'bg-slate-200'}`} />
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
              <CardTitle className="text-sm font-bold text-blue-800">Actions — {stageInfo(order.stage)?.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.stage === 'submitted' && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => advanceStage('warehouse_review')} disabled={isSubmitting}>
                    <Warehouse className="h-4 w-4 mr-1" /> Start Warehouse Review
                  </Button>
                </div>
              )}
              {order.stage === 'warehouse_review' && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">Review DC stock levels below. If stock is insufficient for some items, request procurement.</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => advanceStage('allocation')} disabled={isSubmitting}>
                      <Package className="h-4 w-4 mr-1" /> All Items Available — Allocate
                    </Button>
                    <Button size="sm" variant="outline" onClick={requestProcurement} disabled={isSubmitting}>
                      <ShoppingCart className="h-4 w-4 mr-1" /> Request Procurement
                    </Button>
                  </div>
                  <div>
                    <Label className="text-xs">Note (optional)</Label>
                    <Input value={generalNote} onChange={e => setGeneralNote(e.target.value)} placeholder="Add a note..." className="mt-1" />
                  </div>
                </div>
              )}
              {order.stage === 'procurement_needed' && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">Purchasing team should create a Purchase Requisition for the outstanding items.</p>
                  <div>
                    <Label className="text-xs">Requisition Note</Label>
                    <Input value={requisitionNote} onChange={e => setRequisitionNote(e.target.value)} placeholder="e.g. Urgent restock for branch orders..." className="mt-1" />
                  </div>
                  <Button size="sm" onClick={createRequisition} disabled={isSubmitting}>
                    <ClipboardCheck className="h-4 w-4 mr-1" /> Create Purchase Requisition
                  </Button>
                </div>
              )}
              {order.stage === 'requisition_created' && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">Requisition created. Create a Purchase Order to send to supplier.</p>
                  <div>
                    <Label className="text-xs">PO Note</Label>
                    <Input value={poNote} onChange={e => setPoNote(e.target.value)} placeholder="Supplier details..." className="mt-1" />
                  </div>
                  <Button size="sm" onClick={() => advanceStage('po_created', poNote)} disabled={isSubmitting}>
                    <ShoppingCart className="h-4 w-4 mr-1" /> Mark PO Created
                  </Button>
                </div>
              )}
              {order.stage === 'po_created' && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">Goods have arrived. Record received quantities below.</p>
                  <div className="bg-white border rounded-lg p-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Ordered</TableHead>
                          <TableHead className="text-right w-28">Received Qty</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {order.lines.filter(l => Number(l.outstandingQty) > 0).map(l => (
                          <TableRow key={l.id}>
                            <TableCell className="text-sm">{l.productName}</TableCell>
                            <TableCell className="text-right text-sm">{Number(l.outstandingQty)}</TableCell>
                            <TableCell className="text-right">
                              <Input type="number" min="0" value={receiveLines[l.id] || ''} onChange={e => setReceiveLines(p => ({ ...p, [l.id]: parseInt(e.target.value) || 0 }))} className="text-right" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <Button size="sm" onClick={receiveGoods} disabled={isSubmitting}>
                    <Truck className="h-4 w-4 mr-1" /> Confirm Goods Received
                  </Button>
                </div>
              )}
              {order.stage === 'goods_received' && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">Some items received. Proceed to allocate all available stock.</p>
                  <Button size="sm" onClick={() => advanceStage('allocation')} disabled={isSubmitting}>
                    <Package className="h-4 w-4 mr-1" /> Proceed to Allocation
                  </Button>
                </div>
              )}
              {order.stage === 'allocation' && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">Allocate DC stock and dispatch to branch.</p>
                  <Button size="sm" onClick={handleFulfill} disabled={isSubmitting}>
                    <Send className="h-4 w-4 mr-1" /> Allocate & Dispatch
                  </Button>
                </div>
              )}
              {order.stage === 'dispatched' && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">Order dispatched to branch. Close to mark as complete.</p>
                  <Button size="sm" onClick={() => advanceStage('closed')} disabled={isSubmitting}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Close Back Order
                  </Button>
                </div>
              )}
              {order.stage === 'closed' && (
                <p className="text-sm text-slate-500">This back order is closed.</p>
              )}
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Requested</TableHead>
                    <TableHead className="text-right">DC Stock</TableHead>
                    <TableHead className="text-right">Purchased</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Allocated</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.lines.map(line => {
                    const outstanding = Number(line.outstandingQty);
                    return (
                      <TableRow key={line.id} className={outstanding <= 0 ? 'opacity-50' : ''}>
                        <TableCell>
                          <p className="font-medium text-sm">{line.productName}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{line.productId}</p>
                        </TableCell>
                        <TableCell className="text-right text-sm">{Number(line.requestedQty)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={line.availableStock > 0 ? 'success' : 'destructive'}>{line.availableStock}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm text-blue-600">{Number(line.purchasedQty)}</TableCell>
                        <TableCell className="text-right text-sm text-teal-600">{Number(line.receivedQty)}</TableCell>
                        <TableCell className="text-right text-sm text-emerald-600">{Number(line.allocatedQty)}</TableCell>
                        <TableCell className="text-right text-sm font-semibold text-amber-600">{outstanding}</TableCell>
                        <TableCell>
                          <Badge variant={
                            line.status === 'allocated' ? 'success' :
                            line.status === 'partially_allocated' ? 'warning' : 'default'
                          }>{line.status?.replace(/_/g, ' ')}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Order Info */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Order Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Branch</span><span className="font-medium">{order.branch.name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Requested By</span><span>{order.requestedBy}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Created</span><span>{new Date(order.createdAt).toLocaleDateString()}</span></div>
              {order.customerName && <div className="flex justify-between"><span className="text-slate-500">Customer</span><span className="font-medium">{order.customerName}</span></div>}
              {order.customerRef && <div className="flex justify-between"><span className="text-slate-500">Customer Ref</span><span>{order.customerRef}</span></div>}
              {order.targetDate && <div className="flex justify-between"><span className="text-slate-500">Target Date</span><span className={new Date(order.targetDate) < new Date() ? 'text-red-600 font-medium' : ''}>{new Date(order.targetDate).toLocaleDateString()}</span></div>}
              {order.notes && <div><span className="text-slate-500">Notes:</span><p className="mt-1 text-xs bg-slate-50 p-2 rounded">{order.notes}</p></div>}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Activity Timeline ({order.activities.length})</CardTitle></CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
              {order.activities.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No activity yet</p>
              ) : order.activities.map(act => {
                const fromInfo = act.fromStage ? stageInfo(act.fromStage) : null;
                const toInfo = act.toStage ? stageInfo(act.toStage) : null;
                return (
                  <div key={act.id} className="border-l-2 border-slate-200 pl-3 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-700">{act.action.replace(/_/g, ' ')}</span>
                      {fromInfo && toInfo && (
                        <span className="text-[10px] text-slate-400">{fromInfo.label} → {toInfo.label}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      <User className="h-3 w-3 inline mr-1" />{act.performedBy} · {new Date(act.createdAt).toLocaleString()}
                    </p>
                    {act.notes && <p className="text-xs text-slate-500 mt-1 bg-slate-50 p-1.5 rounded">{act.notes}</p>}
                    {act.refType && <Badge className="mt-1 text-[10px]" variant="outline">{act.refType}: {act.refId}</Badge>}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

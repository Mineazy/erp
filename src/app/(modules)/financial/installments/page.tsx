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
import { CreditCard, Plus, Search, Eye, Banknote, Calendar, CheckCircle, Clock, DollarSign } from 'lucide-react';

interface InstallmentPlan {
  id: string;
  planNumber: string;
  arInvoiceId?: string | null;
  customerId: string;
  customerName: string;
  productName: string;
  productCategory?: string | null;
  productDescription?: string | null;
  totalAmount: number;
  depositAmount: number;
  balanceAmount: number;
  monthlyPayment: number;
  numberOfMonths: number;
  startDate: string;
  endDate: string;
  status: string;
  notes?: string | null;
  createdAt: string;
  payments: InstallmentPayment[];
  arInvoice?: { invoiceNumber: string; id: string } | null;
}

interface InstallmentPayment {
  id: string;
  planId: string;
  paymentDate: string;
  amount: number;
  balanceAfter: number;
  paymentMethod: string;
  receiptNumber?: string | null;
  reference?: string | null;
  notes?: string | null;
  receivedBy?: string | null;
  createdAt: string;
}

interface StaffOption { id: string; employeeCode: string; firstName: string; lastName: string; }

const productCategories = ['Compressors', 'Alternators', 'Generators', 'Ball Mills', 'Jaw Crushers', 'Tractors', 'Heavy Duty Equipment', 'Industrial Machinery', 'Construction Equipment', 'Mining Equipment', 'Other'];
const paymentMethods = ['cash', 'bank_transfer', 'mobile_money', 'cheque', 'card'];
const planStatuses = ['active', 'completed', 'defaulted', 'cancelled'];

export default function InstallmentsPage() {
  const [data, setData] = useState<InstallmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [customers, setCustomers] = useState<{ value: string; label: string }[]>([]);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [form, setForm] = useState({ customerId: '', customerName: '', productName: '', productCategory: '', productDescription: '', totalAmount: '', depositAmount: '', numberOfMonths: '3', startDate: '', notes: '' });

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<InstallmentPlan | null>(null);

  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', paymentDate: '', paymentMethod: 'cash', reference: '', notes: '' });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (categoryFilter) params.set('productCategory', categoryFilter);
      const res = await fetch(`/api/financial/installments?${params}`);
      if (!res.ok) throw new Error('Failed');
      setData(await res.json());
    } catch { toast('Failed to fetch installment plans', 'error'); } finally { setLoading(false); }
  }, [search, statusFilter, categoryFilter]);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/financial/ar');
      const json = await res.json();
      const unique = new Map<string, string>();
      (json as any[]).forEach((inv: any) => unique.set(inv.customerId, inv.customerName));
      setCustomers(Array.from(unique.entries()).map(([id, name]) => ({ value: id, label: name })));
    } catch {}
  };

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchCustomers(); }, []);

  const handleCreate = async () => {
    if (!form.customerName || !form.productName || !form.totalAmount || !form.startDate) {
      toast('Please fill all required fields', 'error'); return;
    }
    const tid = toast('Creating installment plan...', 'info', 120000);
    try {
      const res = await fetch('/api/financial/installments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed'); }
      toast('Installment plan created', 'success');
      setCreateDialogOpen(false);
      setForm({ customerId: '', customerName: '', productName: '', productCategory: '', productDescription: '', totalAmount: '', depositAmount: '', numberOfMonths: '3', startDate: '', notes: '' });
      fetchData();
    } catch (e: any) { toast(e.message, 'error'); } finally { dismissToast(tid); }
  };

  const handlePayment = async () => {
    if (!selectedPlan || !payForm.amount || !payForm.paymentDate) {
      toast('Please enter amount and date', 'error'); return;
    }
    const tid = toast('Recording payment...', 'info', 120000);
    try {
      const res = await fetch(`/api/financial/installments/${selectedPlan.id}/payments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payForm) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed'); }
      toast('Payment recorded successfully', 'success');
      setPayDialogOpen(false);
      setPayForm({ amount: '', paymentDate: '', paymentMethod: 'cash', reference: '', notes: '' });
      fetchData();
      const updated = await fetch(`/api/financial/installments/${selectedPlan.id}`).then(r => r.json());
      setSelectedPlan(updated);
    } catch (e: any) { toast(e.message, 'error'); } finally { dismissToast(tid); }
  };

  const openView = async (plan: InstallmentPlan) => {
    try {
      const res = await fetch(`/api/financial/installments/${plan.id}`);
      if (res.ok) setSelectedPlan(await res.json());
      else setSelectedPlan(plan);
    } catch { setSelectedPlan(plan); }
    setViewDialogOpen(true);
  };

  const openPay = (plan: InstallmentPlan) => {
    setSelectedPlan(plan);
    const today = new Date().toISOString().split('T')[0];
    setPayForm({ amount: String(plan.monthlyPayment), paymentDate: today, paymentMethod: 'cash', reference: '', notes: '' });
    setPayDialogOpen(true);
  };

  const statusColor = (s: string) => {
    if (s === 'completed') return 'bg-emerald-100 text-emerald-800';
    if (s === 'defaulted') return 'bg-red-100 text-red-800';
    if (s === 'cancelled') return 'bg-slate-100 text-slate-600';
    return 'bg-blue-100 text-blue-800';
  };

  const monthlyTotal = data.filter(p => p.status === 'active').reduce((s, p) => s + Number(p.monthlyPayment), 0);
  const totalOutstanding = data.filter(p => p.status === 'active').reduce((s, p) => s + Number(p.balanceAmount), 0);
  const totalCollected = data.reduce((s, p) => s + p.payments.reduce((ps, pay) => ps + Number(pay.amount), 0), 0);

  if (loading && data.length === 0) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Installment Plans</h2>
          <p className="text-slate-500 mt-1">Manage heavy duty equipment installment sales and track payments</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> New Installment Plan</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Active Plans</p><p className="text-xl font-bold text-blue-600">{data.filter(p => p.status === 'active').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Total Outstanding</p><p className="text-xl font-bold text-amber-600">${totalOutstanding.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Monthly Collections</p><p className="text-xl font-bold text-emerald-600">${monthlyTotal.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Total Collected</p><p className="text-xl font-bold text-slate-900">${totalCollected.toLocaleString()}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-mine-blue-600" /> Installment Records</CardTitle>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input type="search" placeholder="Search customer or product..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full sm:w-36">
                <option value="">All Status</option>
                {planStatuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </Select>
              <Select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full sm:w-44">
                <option value="">All Categories</option>
                {productCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Plan #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Deposit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Monthly</TableHead>
                  <TableHead>Months</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-slate-400">No installment plans found</TableCell></TableRow>
                ) : data.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm font-medium">{p.planNumber}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium text-sm">{p.customerName}</span>
                        {p.arInvoice && <p className="text-[11px] text-slate-400">Invoice: {p.arInvoice.invoiceNumber}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="text-sm">{p.productName}</span>
                        {p.productCategory && <p className="text-[11px] text-slate-400">{p.productCategory}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">${Number(p.totalAmount).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-emerald-600">${Number(p.depositAmount).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold text-amber-600">${Number(p.balanceAmount).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono text-sm">${Number(p.monthlyPayment).toLocaleString()}</TableCell>
                    <TableCell className="text-center text-sm">{p.numberOfMonths}</TableCell>
                    <TableCell><Badge className={statusColor(p.status)}>{p.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {p.status === 'active' && <Button variant="ghost" size="sm" onClick={() => openPay(p)}><Banknote className="h-4 w-4 mr-1 text-emerald-600" /> Pay</Button>}
                        <Button variant="ghost" size="sm" onClick={() => openView(p)}><Eye className="h-4 w-4 mr-1" /> View</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Plan Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} size="2xl">
        <div className="space-y-4">
          <h3 className="text-lg font-bold">New Installment Plan</h3>
          <Select label="Customer (from AR)" options={[{ value: '', label: '— Enter New Customer Below —' }, ...customers]} value={form.customerId} onChange={e => {
            const val = e.target.value;
            const cust = customers.find(c => c.value === val);
            setForm({ ...form, customerId: val, customerName: cust ? cust.label : form.customerName });
          }} />
          {!form.customerId && <Input label="Customer Name *" value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} placeholder="Customer name" />}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Product Name *" value={form.productName} onChange={e => setForm({ ...form, productName: e.target.value })} placeholder="e.g. Atlas Copco GA90 Compressor" />
            <Select label="Product Category" options={[{ value: '', label: '— Select Category —' }, ...productCategories.map(c => ({ value: c, label: c }))]} value={form.productCategory} onChange={e => setForm({ ...form, productCategory: e.target.value })} />
          </div>
          <div>
            <Label>Product Description</Label>
            <textarea value={form.productDescription} onChange={e => setForm({ ...form, productDescription: e.target.value })} placeholder="Serial number, specs, etc..." className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Total Amount *" type="number" step="0.01" value={form.totalAmount} onChange={e => setForm({ ...form, totalAmount: e.target.value })} placeholder="0.00" />
            <Input label="Deposit Amount" type="number" step="0.01" value={form.depositAmount} onChange={e => setForm({ ...form, depositAmount: e.target.value })} placeholder="0.00" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Number of Months *" options={[{ value: '3', label: '3 Months' }, { value: '4', label: '4 Months' }, { value: '5', label: '5 Months' }, { value: '6', label: '6 Months' }]} value={form.numberOfMonths} onChange={e => setForm({ ...form, numberOfMonths: e.target.value })} />
            <Input label="Start Date *" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
          </div>
          {form.totalAmount && form.depositAmount !== undefined && (
            <div className="bg-slate-50 p-3 rounded-lg text-sm space-y-1">
              <p><span className="text-slate-500">Finance Amount:</span> <span className="font-medium">${(parseFloat(form.totalAmount) - parseFloat(form.depositAmount || '0')).toLocaleString()}</span></p>
              <p><span className="text-slate-500">Monthly Payment:</span> <span className="font-bold text-emerald-600">${((parseFloat(form.totalAmount) - parseFloat(form.depositAmount || '0')) / parseInt(form.numberOfMonths)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
            </div>
          )}
          <div>
            <Label>Notes</Label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate}>Create Plan</Button>
        </DialogFooter>
      </Dialog>

      {/* View Plan Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} size="3xl">
        {selectedPlan && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">{selectedPlan.planNumber}</h3>
                <p className="text-sm text-slate-500">{selectedPlan.customerName} — {selectedPlan.productName}</p>
              </div>
              <Badge className={statusColor(selectedPlan.status)}>{selectedPlan.status}</Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-slate-50 p-3 rounded-lg"><p className="text-slate-500 text-xs">Total Amount</p><p className="font-bold">${Number(selectedPlan.totalAmount).toLocaleString()}</p></div>
              <div className="bg-emerald-50 p-3 rounded-lg"><p className="text-slate-500 text-xs">Deposit Paid</p><p className="font-bold text-emerald-700">${Number(selectedPlan.depositAmount).toLocaleString()}</p></div>
              <div className="bg-amber-50 p-3 rounded-lg"><p className="text-slate-500 text-xs">Balance Outstanding</p><p className="font-bold text-amber-700">${Number(selectedPlan.balanceAmount).toLocaleString()}</p></div>
              <div className="bg-blue-50 p-3 rounded-lg"><p className="text-slate-500 text-xs">Monthly Payment</p><p className="font-bold text-blue-700">${Number(selectedPlan.monthlyPayment).toLocaleString()}</p></div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-slate-500">Category:</span> <span className="font-medium">{selectedPlan.productCategory || 'N/A'}</span></div>
              <div><span className="text-slate-500">Duration:</span> <span className="font-medium">{selectedPlan.numberOfMonths} months</span></div>
              <div><span className="text-slate-500">Start:</span> <span className="font-medium">{new Date(selectedPlan.startDate).toLocaleDateString()}</span></div>
              <div><span className="text-slate-500">End:</span> <span className="font-medium">{new Date(selectedPlan.endDate).toLocaleDateString()}</span></div>
            </div>

            {selectedPlan.productDescription && (
              <div className="text-sm"><span className="text-slate-500">Description:</span> <span className="font-medium">{selectedPlan.productDescription}</span></div>
            )}

            {selectedPlan.arInvoice && (
              <div className="text-sm bg-blue-50 border border-blue-200 p-2 rounded">
                <span className="text-blue-700">Linked AR Invoice:</span> <span className="font-medium">{selectedPlan.arInvoice.invoiceNumber}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm">Payment History ({selectedPlan.payments.length})</h4>
              {selectedPlan.status === 'active' && (
                <Button variant="outline" size="sm" onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setPayForm({ amount: String(selectedPlan!.monthlyPayment), paymentDate: today, paymentMethod: 'cash', reference: '', notes: '' });
                  setPayDialogOpen(true);
                }}><Plus className="h-4 w-4 mr-1" /> Record Payment</Button>
              )}
            </div>

            {selectedPlan.payments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Receipt #</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance After</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Received By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedPlan.payments.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm">{new Date(p.paymentDate).toLocaleDateString()}</TableCell>
                      <TableCell className="font-mono text-xs">{p.receiptNumber}</TableCell>
                      <TableCell className="text-right font-mono text-emerald-600">${Number(p.amount).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">${Number(p.balanceAfter).toLocaleString()}</TableCell>
                      <TableCell className="text-sm capitalize">{p.paymentMethod.replace(/_/g, ' ')}</TableCell>
                      <TableCell className="text-sm text-slate-500">{p.receivedBy}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">No payments recorded yet</p>
            )}

            {selectedPlan.status === 'active' && selectedPlan.payments.length > 0 && (
              <div className="bg-slate-50 p-3 rounded-lg text-sm">
                <p><span className="text-slate-500">Payments Made:</span> <span className="font-medium">{selectedPlan.payments.length} of {selectedPlan.numberOfMonths}</span></p>
                <p><span className="text-slate-500">Remaining:</span> <span className="font-medium text-amber-600">${Number(selectedPlan.balanceAmount).toLocaleString()}</span></p>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogFooter>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={payDialogOpen} onClose={() => setPayDialogOpen(false)} size="md">
        <div className="space-y-4">
          <h3 className="text-lg font-bold">Record Payment — {selectedPlan?.planNumber}</h3>
          <div className="bg-slate-50 p-3 rounded-lg text-sm space-y-1">
            <p><span className="text-slate-500">Customer:</span> {selectedPlan?.customerName}</p>
            <p><span className="text-slate-500">Product:</span> {selectedPlan?.productName}</p>
            <p><span className="text-slate-500">Outstanding:</span> <span className="font-bold text-amber-600">${Number(selectedPlan?.balanceAmount || 0).toLocaleString()}</span></p>
          </div>
          <Input label="Payment Amount *" type="number" step="0.01" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} placeholder="0.00" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Payment Date *" type="date" value={payForm.paymentDate} onChange={e => setPayForm({ ...payForm, paymentDate: e.target.value })} />
            <Select label="Payment Method" options={paymentMethods.map(m => ({ value: m, label: m.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }))} value={payForm.paymentMethod} onChange={e => setPayForm({ ...payForm, paymentMethod: e.target.value })} />
          </div>
          <Input label="Reference" value={payForm.reference} onChange={e => setPayForm({ ...payForm, reference: e.target.value })} placeholder="Transaction reference, cheque number..." />
          <div>
            <Label>Notes</Label>
            <textarea value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} placeholder="Payment notes..." className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500" rows={2} />
          </div>
          {payForm.amount && (
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-sm">
              <p>New balance after payment: <span className="font-bold">${(Number(selectedPlan?.balanceAmount || 0) - parseFloat(payForm.amount || '0')).toLocaleString()}</span></p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setPayDialogOpen(false)}>Cancel</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handlePayment}>Record Payment</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

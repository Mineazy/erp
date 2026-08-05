'use client';

import { toast, dismissToast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { FileText, Plus, Search, Send, Repeat, Eye, Package } from 'lucide-react';
import type { Quotation } from '@/types';

interface LineItem {
  productId: string;
  productName: string;
  quantity: string;
  unitPrice: string;
}

interface Product {
  id: string;
  name: string;
  code: string;
  sellingPrice: number;
}

const emptyLine = (): LineItem => ({ productId: '', productName: '', quantity: '1', unitPrice: '0' });

const statusBadge: Record<string, { variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive'; label: string }> = {
  draft: { variant: 'secondary', label: 'Draft' },
  sent: { variant: 'default', label: 'Sent' },
  accepted: { variant: 'success', label: 'Accepted' },
  rejected: { variant: 'destructive', label: 'Rejected' },
  converted: { variant: 'success', label: 'Converted' },
  expired: { variant: 'warning', label: 'Expired' },
};

export default function QuotationsPage() {
  const [data, setData] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Quotation | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [quoteDate, setQuoteDate] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [taxAmount, setTaxAmount] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);

  const [voucherOpen, setVoucherOpen] = useState(false);
  const [voucherData, setVoucherData] = useState<any>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const voucherRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '200');
      const res = await fetch(`/api/sales/quotations?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const d = await res.json();
      setData(Array.isArray(d) ? d : (d.items || []));
    } catch { toast('Failed to fetch quotations', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [search, statusFilter]);

  useEffect(() => {
    fetch('/api/inventory/products?limit=200').then(async r => {
      if (r.ok) { const d = await r.json(); setProducts(Array.isArray(d) ? d : (d.items || [])); }
    }).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditing(null);
    setCustomerName(''); setCustomerEmail(''); setQuoteDate(''); setValidUntil('');
    setNotes(''); setTerms(''); setTaxAmount('0'); setDiscount('0');
    setLines([emptyLine()]);
    setDialogOpen(true);
  };

  const openEdit = (q: Quotation) => {
    setEditing(q);
    setCustomerName(q.customerName); setCustomerEmail(q.customerEmail || '');
    setQuoteDate(q.quoteDate?.split('T')[0] || ''); setValidUntil(q.validUntil?.split('T')[0] || '');
    setNotes(q.notes || ''); setTerms(q.terms || '');
    setTaxAmount(String(q.taxAmount)); setDiscount(String(q.discount));
    setLines((q.lines || []).map(l => ({
      productId: l.productId, productName: l.productName,
      quantity: String(l.quantity), unitPrice: String(l.unitPrice),
    })));
    setDialogOpen(true);
  };

  const openVoucher = async (item: Quotation) => {
    setVoucherLoading(true); setVoucherOpen(true);
    try {
      const res = await fetch(`/api/sales/quotations/${item.id}/generate`, { method: 'POST' });
      if (res.ok) setVoucherData(await res.json());
      else toast('Failed to generate document', 'error');
    } catch { toast('Network error', 'error'); }
    setVoucherLoading(false);
  };

  const handleSend = async (id: string) => {
    const ok = await confirmDialog({ title: 'Send Quotation', message: 'Mark this quotation as sent to the customer?', variant: 'info' });
    if (!ok) return;
    const tid = toast('Sending quotation...', 'info', 120000);
    try {
      const res = await fetch(`/api/sales/quotations/${id}/send`, { method: 'POST' });
      if (res.ok) { dismissToast(tid); toast('Quotation sent successfully', 'success'); fetchData(); }
      else { const e = await res.json().catch(() => ({ error: 'Failed' })); dismissToast(tid); toast(e.error || 'Failed to send', 'error'); }
    } catch { dismissToast(tid); toast('Network error', 'error'); }
  };

  const handleConvert = async (id: string) => {
    const ok = await confirmDialog({ title: 'Convert to Sales Order', message: 'Create a sales order from this quotation?', variant: 'info' });
    if (!ok) return;
    const tid = toast('Converting...', 'info', 120000);
    try {
      const res = await fetch(`/api/sales/quotations/${id}/convert`, { method: 'POST' });
      if (res.ok) { dismissToast(tid); toast('Converted to sales order successfully', 'success'); fetchData(); }
      else { const e = await res.json().catch(() => ({ error: 'Failed' })); dismissToast(tid); toast(e.error || 'Failed to convert', 'error'); }
    } catch { dismissToast(tid); toast('Network error', 'error'); }
  };

  const handleSave = async () => {
    const nonEmpty = lines.filter(l => l.productId && l.productName);
    if (!customerName) { toast('Customer name is required', 'warning'); return; }
    if (nonEmpty.length === 0) { toast('At least one line item is required', 'warning'); return; }

    const tid = toast('Saving quotation...', 'info', 120000);
    try {
      const body = {
        customerName, customerEmail,
        quoteDate: quoteDate || undefined,
        validUntil: validUntil || undefined,
        notes, terms, taxAmount, discount,
        lines: nonEmpty.map(l => ({
          productId: l.productId, productName: l.productName,
          quantity: parseFloat(l.quantity) || 0, unitPrice: parseFloat(l.unitPrice) || 0,
        })),
      };
      let res;
      if (editing) {
        res = await fetch(`/api/sales/quotations/${editing.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
      } else {
        res = await fetch('/api/sales/quotations', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
      }
      if (res.ok) {
        dismissToast(tid);
        toast(`Quotation ${editing ? 'updated' : 'created'} successfully`, 'success');
        setDialogOpen(false);
        fetchData();
      } else {
        const e = await res.json().catch(() => ({ error: 'Save failed' }));
        dismissToast(tid); toast(e.error || 'Failed to save', 'error');
      }
    } catch { dismissToast(tid); toast('Network error', 'error'); }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({ title: 'Delete', message: 'Delete this quotation?', variant: 'danger' });
    if (!ok) return;
    const tid = toast('Deleting...', 'info', 120000);
    try {
      const res = await fetch(`/api/sales/quotations/${id}`, { method: 'DELETE' });
      if (res.ok) { dismissToast(tid); toast('Deleted', 'success'); fetchData(); }
      else { const e = await res.json().catch(() => ({ error: 'Failed' })); dismissToast(tid); toast(e.error || 'Failed', 'error'); }
    } catch { dismissToast(tid); toast('Network error', 'error'); }
  };

  const addLine = () => setLines([...lines, emptyLine()]);
  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));
  const updateLine = (idx: number, field: keyof LineItem, value: string) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === 'productId') {
      const prod = products.find(p => p.id === value);
      if (prod) {
        updated[idx].productName = prod.name;
        if (updated[idx].unitPrice === '0') updated[idx].unitPrice = String(prod.sellingPrice || 0);
      }
    }
    setLines(updated);
  };

  const printVoucher = () => window.print();

  const calcSubtotal = () => lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0), 0);
  const calcTotal = () => calcSubtotal() + (parseFloat(taxAmount) || 0) - (parseFloat(discount) || 0);

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Quotations</h2>
          <p className="text-slate-500 mt-1">Create, send, and manage customer quotations</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Quotation
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-mine-blue-800" />
              Quotations
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="text" placeholder="Search quotations..." value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-56" />
              </div>
              <Select options={[
                { value: '', label: 'All Status' },
                { value: 'draft', label: 'Draft' },
                { value: 'sent', label: 'Sent' },
                { value: 'accepted', label: 'Accepted' },
                { value: 'rejected', label: 'Rejected' },
                { value: 'converted', label: 'Converted' },
                { value: 'expired', label: 'Expired' },
              ]} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-36" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-slate-400 py-8">No quotations found</TableCell></TableRow>
              ) : data.map((item) => {
                const sb = statusBadge[item.status] || { variant: 'secondary' as const, label: item.status };
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs font-medium">{item.quoteNumber}</TableCell>
                    <TableCell className="text-sm">{item.customerName}</TableCell>
                    <TableCell className="text-xs">{item.lines?.length || 0} item(s)</TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {item.currency} {Number(item.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-xs">{new Date(item.quoteDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-xs">{item.validUntil ? new Date(item.validUntil).toLocaleDateString() : '—'}</TableCell>
                    <TableCell><Badge variant={sb.variant}>{sb.label}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {item.status === 'draft' && (
                          <button onClick={() => handleSend(item.id)} className="p-1.5 hover:bg-slate-100 rounded" title="Send">
                            <Send className="h-4 w-4 text-mine-blue-600" />
                          </button>
                        )}
                        {(item.status === 'sent' || item.status === 'accepted') && (
                          <button onClick={() => handleConvert(item.id)} className="p-1.5 hover:bg-slate-100 rounded" title="Convert to Sales Order">
                            <Repeat className="h-4 w-4 text-mine-green-700" />
                          </button>
                        )}
                        <button onClick={() => openVoucher(item)} className="p-1.5 hover:bg-slate-100 rounded" title="View Document">
                          <Eye className="h-4 w-4 text-slate-500" />
                        </button>
                        {item.status === 'draft' && (
                          <>
                            <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-slate-100 rounded" title="Edit">
                              <FileText className="h-4 w-4 text-slate-400" />
                            </button>
                            <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-red-50 rounded" title="Delete">
                              <Package className="h-4 w-4 text-red-400" />
                            </button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={editing ? 'Edit Quotation' : 'New Quotation'} size="xl" className="max-w-4xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Customer Name" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer name" />
            <Input label="Customer Email" type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="email@customer.com" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Quote Date" type="date" value={quoteDate} onChange={e => setQuoteDate(e.target.value)} />
            <Input label="Valid Until" type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-slate-700">Line Items</Label>
            <Button size="sm" variant="outline" onClick={addLine}><Plus className="h-3 w-3 mr-1" />Add Item</Button>
          </div>
          {lines.map((line, idx) => (
            <div key={idx} className="grid grid-cols-5 gap-2 items-end">
              <div className="col-span-2">
                <Select label={idx === 0 ? 'Product' : ''} options={products.map(p => ({ value: p.id, label: `${p.code} - ${p.name}` }))}
                  value={line.productId} onChange={e => updateLine(idx, 'productId', e.target.value)} placeholder="Select..." />
              </div>
              <Input label={idx === 0 ? 'Qty' : ''} type="number" value={line.quantity} onChange={e => updateLine(idx, 'quantity', e.target.value)} />
              <Input label={idx === 0 ? 'Unit Price' : ''} type="number" value={line.unitPrice} onChange={e => updateLine(idx, 'unitPrice', e.target.value)} />
              <div className="flex items-end gap-1">
                <div className="flex-1 text-sm font-mono text-slate-600 pt-2">
                  {idx === 0 && <span className="block text-xs font-medium text-slate-500 mb-1">Total</span>}
                  $ {((parseFloat(line.quantity) || 0) * (parseFloat(line.unitPrice) || 0)).toFixed(2)}
                </div>
                {lines.length > 1 && (
                  <button onClick={() => removeLine(idx)} className="p-1.5 hover:bg-red-50 rounded mb-1"><Package className="h-4 w-4 text-red-400" /></button>
                )}
              </div>
            </div>
          ))}
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Discount" type="number" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0.00" />
            <Input label="Tax Amount" type="number" value={taxAmount} onChange={e => setTaxAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="text-right text-sm">
            <span className="text-slate-500">Subtotal: </span>
            <span className="font-semibold">$ {calcSubtotal().toFixed(2)}</span>
            <span className="mx-2 text-slate-300">|</span>
            <span className="text-slate-500">Total: </span>
            <span className="font-bold text-lg text-mine-blue-800">$ {calcTotal().toFixed(2)}</span>
          </div>
          <Input label="Terms & Conditions" value={terms} onChange={e => setTerms(e.target.value)} placeholder="Payment terms, delivery terms, etc." />
          <Input label="Notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes..." />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>{editing ? 'Update' : 'Create'}</Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={voucherOpen} onClose={() => { setVoucherOpen(false); setVoucherData(null); }} title="" size="xl" className="max-w-4xl">
        {voucherLoading ? (
          <div className="p-8 text-center text-slate-500">Generating document...</div>
        ) : voucherData ? (
          <div ref={voucherRef} className="print-area p-6">
            <div className="mb-6 flex items-start gap-4">
              <img src="/logo.png" alt="Mineazy" className="h-32 w-32 object-contain flex-shrink-0" />
              <div>
                <h2 className="text-xl font-bold text-slate-900 uppercase tracking-wide">{voucherData.title}</h2>
                <p className="text-sm text-slate-500 mt-1">#{voucherData.quoteNumber}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div><span className="font-medium text-slate-600">Date:</span> {new Date(voucherData.quoteDate).toLocaleDateString()}</div>
              <div><span className="font-medium text-slate-600">Valid Until:</span> {voucherData.validUntil ? new Date(voucherData.validUntil).toLocaleDateString() : 'N/A'}</div>
              <div><span className="font-medium text-slate-600">Customer:</span> {voucherData.customerName}</div>
              <div><span className="font-medium text-slate-600">Email:</span> {voucherData.customerEmail || '—'}</div>
              <div><span className="font-medium text-slate-600">Branch:</span> {voucherData.branch || '—'}</div>
              <div><span className="font-medium text-slate-600">Prepared By:</span> {voucherData.createdBy || '—'}</div>
            </div>
            {voucherData.branchAddress && <p className="text-xs text-slate-400 mb-4">{voucherData.branchAddress}</p>}
            <Separator />
            <table className="w-full mt-4 text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 font-medium text-slate-600">#</th>
                  <th className="text-left py-2 font-medium text-slate-600">Product</th>
                  <th className="text-right py-2 font-medium text-slate-600">Quantity</th>
                  <th className="text-right py-2 font-medium text-slate-600">Unit Price</th>
                  <th className="text-right py-2 font-medium text-slate-600">Total</th>
                </tr>
              </thead>
              <tbody>
                {voucherData.lines.map((line: any, idx: number) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="py-2 text-slate-500">{idx + 1}</td>
                    <td className="py-2">{line.productName}</td>
                    <td className="py-2 text-right font-mono">{line.quantity}</td>
                    <td className="py-2 text-right font-mono">{voucherData.currency} {Number(line.unitPrice).toFixed(2)}</td>
                    <td className="py-2 text-right font-mono">{voucherData.currency} {Number(line.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={4} className="text-right py-1 text-slate-500">Subtotal:</td><td className="text-right py-1 font-mono">{voucherData.currency} {voucherData.subtotal.toFixed(2)}</td></tr>
                {voucherData.discount > 0 && <tr><td colSpan={4} className="text-right py-1 text-slate-500">Discount:</td><td className="text-right py-1 font-mono text-red-600">-{voucherData.currency} {voucherData.discount.toFixed(2)}</td></tr>}
                {voucherData.taxAmount > 0 && <tr><td colSpan={4} className="text-right py-1 text-slate-500">Tax:</td><td className="text-right py-1 font-mono">{voucherData.currency} {voucherData.taxAmount.toFixed(2)}</td></tr>}
                <tr className="border-t-2 border-slate-300"><td colSpan={4} className="text-right py-2 font-bold text-slate-900">Total:</td><td className="text-right py-2 font-bold font-mono text-lg">{voucherData.currency} {voucherData.total.toFixed(2)}</td></tr>
              </tfoot>
            </table>
            {voucherData.terms && (
              <div className="mt-4">
                <p className="text-xs font-medium text-slate-600">Terms & Conditions:</p>
                <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">{voucherData.terms}</p>
              </div>
            )}
            {voucherData.notes && (
              <p className="mt-2 text-xs text-slate-500"><span className="font-medium">Notes:</span> {voucherData.notes}</p>
            )}
            <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between text-xs text-slate-400">
              <span>Generated: {new Date(voucherData.generatedAt).toLocaleString()}</span>
              <span className="flex items-center gap-1"><img src="/logo.png" alt="" className="h-8 w-8 inline object-contain" /> Mineazy ERP</span>
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => { setVoucherOpen(false); setVoucherData(null); }}>Close</Button>
          <Button onClick={printVoucher} disabled={!voucherData}>
            <FileText className="h-4 w-4 mr-2" />
            Print
          </Button>
        </DialogFooter>
      </Dialog>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: fixed; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}

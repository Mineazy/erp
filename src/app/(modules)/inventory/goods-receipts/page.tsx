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
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ClipboardCheck, Plus, Search, Eye, FileText, Package, Trash2, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface LineItem {
  productId: string;
  productName: string;
  orderedQty: string;
  quantity: string; // Received
  damagedQty: string;
  acceptedQty: string;
  remarks: string;
}

interface Product {
  id: string;
  name: string;
  code: string;
}

const emptyLine = (): LineItem => ({
  productId: '', productName: '', orderedQty: '1', quantity: '1', damagedQty: '0', acceptedQty: '1', remarks: ''
});

export default function GoodsReceiptsPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [insightPoNumber, setInsightPoNumber] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [receivedAt, setReceivedAt] = useState('');
  const [capturedBy, setCapturedBy] = useState('');
  
  const [poFile, setPoFile] = useState<File | null>(null);
  const [dnFile, setDnFile] = useState<File | null>(null);
  const [plFile, setPlFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
  const [products, setProducts] = useState<Product[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/inventory/goods-receipts?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      setData(await res.json());
    } catch {
      toast('Failed to fetch goods receipts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search, statusFilter]);

  useEffect(() => {
    fetch('/api/inventory/products?limit=200').then(async r => { if (r.ok) { const d = await r.json(); setProducts(Array.isArray(d) ? d : (d.items || [])); } }).catch(() => {});
  }, []);

  const handleOpenNew = () => {
    setInsightPoNumber('');
    setSupplierName('');
    setDeliveryNoteNumber('');
    setInvoiceNumber('');
    setReceivedAt(new Date().toISOString().substring(0,16));
    setCapturedBy('');
    setPoFile(null);
    setDnFile(null);
    setPlFile(null);
    setPhotoFile(null);
    setLines([emptyLine()]);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!insightPoNumber || !deliveryNoteNumber) {
      toast('Insight PO Number and Delivery Note are required', 'error');
      return;
    }
    const invalidLines = lines.some(l => !l.productId || !l.quantity);
    if (invalidLines) {
      toast('Please select a product and valid quantities for all lines', 'error');
      return;
    }

    const tid = toast('Saving goods receipt...', 'info', 120000);
    try {
      const payload = {
        insightPoNumber, supplierName, deliveryNoteNumber, invoiceNumber, receivedAt, capturedBy, lines
      };
      
      const formData = new FormData();
      formData.append('payload', JSON.stringify(payload));
      if (poFile) formData.append('poFile', poFile);
      if (dnFile) formData.append('dnFile', dnFile);
      if (plFile) formData.append('plFile', plFile);
      if (photoFile) formData.append('photoFile', photoFile);

      const res = await fetch('/api/inventory/goods-receipts', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Failed to save');
      }

      toast('Goods receipt captured successfully and sent for review', 'success');
      setDialogOpen(false);
      fetchData();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      dismissToast(tid);
    }
  };

  const handleReview = (id: string) => {
    router.push(`/inventory/goods-receipts/${id}/review`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Goods Receiving</h2>
          <p className="text-slate-500 mt-1">Capture deliveries from Insight POs and submit for review</p>
        </div>
        <Button onClick={handleOpenNew} className="bg-mine-blue-600 hover:bg-mine-blue-700">
          <Plus className="h-4 w-4 mr-2" /> Capture Goods Receipt
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-mine-blue-600" />
              Goods Receipts Registry
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Search receipt or PO..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full sm:w-40">
                <option value="">All Statuses</option>
                <option value="Pending Review">Pending Review</option>
                <option value="Under Review">Under Review</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="whitespace-nowrap">Receipt No</TableHead>
                  <TableHead className="whitespace-nowrap">Insight PO</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Date Received</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">Loading...</TableCell></TableRow>
                ) : data.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">No goods receipts found</TableCell></TableRow>
                ) : (
                  data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium whitespace-nowrap">{item.receiptNo}</TableCell>
                      <TableCell>{item.insightPoNumber || 'N/A'}</TableCell>
                      <TableCell>{item.supplierName}</TableCell>
                      <TableCell className="whitespace-nowrap">{new Date(item.receivedAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={
                          item.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                          item.status === 'Pending Review' ? 'bg-amber-100 text-amber-800' :
                          item.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-800'
                        }>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button variant="ghost" size="sm" onClick={() => handleReview(item.id)}>
                          {item.status === 'Pending Review' ? <CheckCircle className="h-4 w-4 mr-1 text-emerald-600" /> : <Eye className="h-4 w-4 mr-1 text-mine-blue-600" />}
                          {item.status === 'Pending Review' ? 'Review' : 'View'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Capture Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-bold mb-4">Capture Goods Receipt</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div><Label>Insight PO Number *</Label><Input value={insightPoNumber} onChange={e => setInsightPoNumber(e.target.value)} /></div>
            <div><Label>Supplier Name</Label><Input value={supplierName} onChange={e => setSupplierName(e.target.value)} /></div>
            <div><Label>Delivery Note Number *</Label><Input value={deliveryNoteNumber} onChange={e => setDeliveryNoteNumber(e.target.value)} /></div>
            <div><Label>Invoice Number (Optional)</Label><Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} /></div>
            <div><Label>Date Received</Label><Input type="datetime-local" value={receivedAt} onChange={e => setReceivedAt(e.target.value)} /></div>
            <div><Label>Received By</Label><Input value={capturedBy} onChange={e => setCapturedBy(e.target.value)} placeholder="Warehouse Clerk Name" /></div>
          </div>

          <Separator className="my-4" />
          <h4 className="font-semibold mb-3">Line Items</h4>
          <div className="border rounded-md overflow-x-auto mb-4">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[200px]">Product</TableHead>
                  <TableHead>Ordered</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Damaged</TableHead>
                  <TableHead>Accepted</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Select 
                        value={line.productId} 
                        onChange={(e) => {
                          const p = products.find(x => x.id === e.target.value);
                          const newLines = [...lines];
                          newLines[index] = { ...line, productId: p?.id || '', productName: p?.name || '' };
                          setLines(newLines);
                        }}
                      >
                        <option value="">Select Product...</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                      </Select>
                    </TableCell>
                    <TableCell><Input type="number" min="0" value={line.orderedQty} onChange={e => { const l=[...lines]; l[index].orderedQty=e.target.value; setLines(l); }} className="w-20" /></TableCell>
                    <TableCell><Input type="number" min="0" value={line.quantity} onChange={e => { const l=[...lines]; l[index].quantity=e.target.value; setLines(l); }} className="w-20" /></TableCell>
                    <TableCell><Input type="number" min="0" value={line.damagedQty} onChange={e => { const l=[...lines]; l[index].damagedQty=e.target.value; setLines(l); }} className="w-20" /></TableCell>
                    <TableCell><Input type="number" min="0" value={line.acceptedQty} onChange={e => { const l=[...lines]; l[index].acceptedQty=e.target.value; setLines(l); }} className="w-20" /></TableCell>
                    <TableCell><Input value={line.remarks} onChange={e => { const l=[...lines]; l[index].remarks=e.target.value; setLines(l); }} /></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => {
                        if (lines.length > 1) { const l = [...lines]; l.splice(index, 1); setLines(l); }
                      }}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Button variant="outline" size="sm" onClick={() => setLines([...lines, emptyLine()])}>+ Add Line Item</Button>

          <Separator className="my-6" />
          <h4 className="font-semibold mb-3">Supporting Documents</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label>Purchase Order Document</Label>
              <Input type="file" onChange={e => setPoFile(e.target.files?.[0] || null)} />
            </div>
            <div>
              <Label>Delivery Note Document</Label>
              <Input type="file" onChange={e => setDnFile(e.target.files?.[0] || null)} />
            </div>
            <div>
              <Label>Packing List</Label>
              <Input type="file" onChange={e => setPlFile(e.target.files?.[0] || null)} />
            </div>
            <div>
              <Label>Photos of damaged goods (Optional)</Label>
              <Input type="file" onChange={e => setPhotoFile(e.target.files?.[0] || null)} />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-mine-blue-600 hover:bg-mine-blue-700">Save & Submit for Review</Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}

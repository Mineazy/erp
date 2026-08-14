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
import { Separator } from '@/components/ui/separator';
import { Store, Search, Eye, Send, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { jsPDF } from 'jspdf';

export default function WarehouseBranchOrdersPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      // Reusing the same endpoint, it fetches orders. We could add a filter for "fromWarehouseId" if needed.
      const res = await fetch(`/api/inventory/branch-orders?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json.items || []);
    } catch {
      toast('Failed to fetch branch orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search, statusFilter]);

  const handleProcess = async (id: string) => {
    if (!confirm('Are you sure you want to process this order and send it to L99 Transit?')) return;
    
    const tid = toast('Processing order...', 'info', 120000);
    try {
      const res = await fetch(`/api/inventory/stock/transfers/${id}/send`, {
        method: 'POST',
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Failed to process order');
      }

      toast('Order processed and sent to L99 Transit', 'success');
      fetchData();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      dismissToast(tid);
    }
  };

  const fetchImageAsBase64 = async (url: string) => {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  };

  const printDispatchNote = async (t: any) => {
    const doc = new jsPDF();
    
    try {
      const logoBase64 = await fetchImageAsBase64('/logo.png');
      doc.addImage(logoBase64, 'PNG', 14, 10, 60, 20);
    } catch (e) {
      console.error('Failed to load logo', e);
    }

    doc.setFontSize(20);
    doc.text('Dispatch Note', 14, 40);
    
    doc.setFontSize(12);
    doc.text(`Order No: ${t.transferNo}`, 14, 50);
    doc.text(`Status: ${t.status}`, 14, 57);
    doc.text(`Date: ${new Date(t.updatedAt || t.createdAt).toLocaleString()}`, 14, 64);
    
    doc.text(`From: ${t.fromWarehouse?.name || 'Warehouse'}`, 14, 77);
    doc.text(`To: ${t.toBranch?.name || 'Branch'}`, 14, 84);
    doc.text(`Requested By: ${t.requestedBy || 'N/A'}`, 14, 91);

    doc.setFontSize(14);
    doc.text('Items:', 14, 105);
    doc.setFontSize(12);
    
    let y = 115;
    t.lines?.forEach((line: any, idx: number) => {
      doc.text(`${idx + 1}. ${line.productName} - Qty: ${line.quantity}`, 14, y);
      y += 8;
    });

    y += 10;
    
    // Add Security Signatures section
    doc.setFontSize(14);
    doc.text('Security Clearance:', 14, y);
    doc.setFontSize(12);
    y += 10;
    doc.text('Dispatched By (Warehouse): _______________________  Sign: _________________  Date: _________', 14, y);
    y += 15;
    doc.text('Checked By (Security):     _______________________  Sign: _________________  Date: _________', 14, y);
    y += 15;
    doc.text('Security Stamp:', 14, y);
    
    // Draw a box for the stamp
    doc.rect(14, y + 5, 50, 30);

    doc.save(`DispatchNote_${t.transferNo}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Branch Stock Orders (Warehouse View)</h2>
          <p className="text-slate-500 mt-1">Review and process incoming stock requests from branches</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-mine-blue-600" />
              Incoming Branch Orders
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Search order no..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full sm:w-40">
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_transit">In Transit</option>
                <option value="received">Received</option>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Order No</TableHead>
                  <TableHead>From Warehouse</TableHead>
                  <TableHead>To Branch</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">Loading...</TableCell></TableRow>
                ) : data.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400">No incoming stock orders found</TableCell></TableRow>
                ) : (
                  data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.transferNo}</TableCell>
                      <TableCell>{item.fromWarehouse?.name || 'N/A'}</TableCell>
                      <TableCell>{item.toBranch?.name || 'N/A'}</TableCell>
                      <TableCell>{item.requestedBy}</TableCell>
                      <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge className={
                          item.status === 'received' ? 'bg-emerald-100 text-emerald-800' :
                          item.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                          item.status === 'in_transit' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
                        }>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedOrder(item); setViewDialogOpen(true); }}>
                          <Eye className="h-4 w-4 mr-1 text-slate-600" />
                          View
                        </Button>
                        {(item.status === 'pending' || item.status === 'draft') && (
                          <Button variant="ghost" size="sm" onClick={() => handleProcess(item.id)}>
                            <Send className="h-4 w-4 mr-1 text-mine-blue-600" />
                            Process
                          </Button>
                        )}
                        {(item.status === 'in_transit' || item.status === 'received') && (
                          <Button variant="ghost" size="sm" onClick={() => printDispatchNote(item)} title="Download Dispatch Note">
                            <FileText className="h-4 w-4 mr-1 text-emerald-600" />
                            PDF
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Order Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">View Stock Order: {selectedOrder?.transferNo}</h3>
            <Badge className={
              selectedOrder?.status === 'received' ? 'bg-emerald-100 text-emerald-800' :
              selectedOrder?.status === 'pending' ? 'bg-amber-100 text-amber-800' :
              selectedOrder?.status === 'in_transit' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
            }>
              {selectedOrder?.status}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <p className="text-slate-500 font-medium">From Warehouse</p>
              <p>{selectedOrder?.fromWarehouse?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">To Branch</p>
              <p>{selectedOrder?.toBranch?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">Requested By</p>
              <p>{selectedOrder?.requestedBy || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">Date</p>
              <p>{selectedOrder?.createdAt ? new Date(selectedOrder.createdAt).toLocaleDateString() : 'N/A'}</p>
            </div>
            {selectedOrder?.notes && (
              <div className="col-span-2">
                <p className="text-slate-500 font-medium">Notes</p>
                <p>{selectedOrder.notes}</p>
              </div>
            )}
          </div>

          <Separator className="my-4" />
          <h4 className="font-semibold mb-3">Line Items</h4>
          <div className="border rounded-md overflow-x-auto mb-4">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Shipped Qty</TableHead>
                  <TableHead>Received Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedOrder?.lines?.map((line: any) => (
                  <TableRow key={line.id}>
                    <TableCell>{line.productName}</TableCell>
                    <TableCell>{line.quantity}</TableCell>
                    <TableCell>{line.receivedQty !== null ? line.receivedQty : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}

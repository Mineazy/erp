'use client';

import { toast, dismissToast } from '@/components/ui/toast';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle, Upload, Plus, Search, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import Link from 'next/link';

interface BackOrder {
  id: string;
  orderNumber: string;
  branch: { name: string };
  status: string;
  lines: Array<{
    id: string;
    productName: string;
    requestedQty: number;
    allocatedQty: number;
    outstandingQty: number;
    status: string;
  }>;
}

export default function BackOrdersPage() {
  const [data, setData] = useState<BackOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadData, setUploadData] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/warehouse/back-orders?search=${search}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws);
        
        // Basic validation - expect Branch ID, Product Code, Quantity
        const parsed = rawData.map((row: any) => ({
          branchId: row['Branch ID'] || row['branchId'] || '',
          productId: row['Product ID'] || row['productId'] || '',
          productName: row['Product Name'] || row['productName'] || 'Unknown Product',
          requestedQty: Number(row['Requested Qty'] || row['Quantity'] || row['quantity'] || 0),
        })).filter(r => r.branchId && r.requestedQty > 0);
        
        setUploadData(parsed);
      } catch (err) {
        toast('Failed to parse spreadsheet', 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  const submitUpload = async () => {
    if (uploadData.length === 0) {
      toast('No valid data to upload', 'error');
      return;
    }
    
    setIsUploading(true);
    const tid = toast('Uploading back orders...', 'info', 120000);
    try {
      const res = await fetch('/api/warehouse/back-orders/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: uploadData }),
      });
      
      dismissToast(tid);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        toast(err.error || 'Failed to upload back orders', 'error');
      } else {
        toast('Back orders uploaded successfully', 'success');
        setUploadDialogOpen(false);
        setUploadData([]);
        fetchData();
      }
    } catch (e) {
      dismissToast(tid);
      toast('Network error', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <Badge variant="secondary">Draft</Badge>;
      case 'submitted': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Submitted</Badge>;
      case 'approved': return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Approved</Badge>;
      case 'partially_allocated': return <Badge variant="warning">Partial</Badge>;
      case 'allocated': return <Badge variant="success">Allocated</Badge>;
      case 'closed': return <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300">Closed</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading && data.length === 0) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Back Order Management</h2>
          <p className="text-slate-500 mt-1">Manage, allocate, and track branch back orders</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setUploadDialogOpen(true)}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Upload CSV/Excel
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Back Order
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Active Back Orders
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Fulfillment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                    No back orders found
                  </TableCell>
                </TableRow>
              ) : (
                data.map((order) => {
                  const totalRequested = order.lines.reduce((sum, l) => sum + l.requestedQty, 0);
                  const totalAllocated = order.lines.reduce((sum, l) => sum + l.allocatedQty, 0);
                  const pct = totalRequested ? Math.round((totalAllocated / totalRequested) * 100) : 0;
                  
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">{order.orderNumber}</TableCell>
                      <TableCell className="font-medium">{order.branch?.name || 'Unknown'}</TableCell>
                      <TableCell>{order.lines.length} products</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden w-24">
                            <div className="h-full bg-green-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-slate-500 font-mono">{pct}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/warehouse/back-orders/${order.id}`}>
                          <Button variant="outline" size="sm">Review</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={uploadDialogOpen} onClose={() => !isUploading && setUploadDialogOpen(false)} title="Upload Back Orders" size="lg">
        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50">
            <Upload className="h-10 w-10 text-slate-400 mx-auto mb-4" />
            <p className="text-sm font-medium text-slate-700 mb-1">Select spreadsheet to upload</p>
            <p className="text-xs text-slate-500 mb-4">Supports .xlsx, .xls, .csv</p>
            <label className="inline-flex items-center justify-center px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">
              <span>Browse Files</span>
              <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
            </label>
          </div>

          {uploadData.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Found {uploadData.length} valid rows</span>
              </div>
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Branch ID</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadData.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs text-slate-500">{row.branchId}</TableCell>
                        <TableCell className="text-sm">{row.productName} <span className="text-xs text-slate-400 font-mono ml-1">({row.productId})</span></TableCell>
                        <TableCell className="text-right font-medium">{row.requestedQty}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setUploadDialogOpen(false)} disabled={isUploading}>Cancel</Button>
          <Button onClick={submitUpload} disabled={uploadData.length === 0 || isUploading}>
            {isUploading ? 'Uploading...' : 'Confirm Upload'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast, dismissToast } from '@/components/ui/toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, CheckCircle, XCircle, FileText, Download } from 'lucide-react';

export default function GoodsReceiptReviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [comments, setComments] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    fetch(`/api/inventory/goods-receipts/${id}`)
      .then(async r => {
        if (!r.ok) throw new Error('Not found');
        setData(await r.json());
      })
      .catch(() => {
        toast('Failed to load receipt', 'error');
        router.push('/inventory/goods-receipts');
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  const submitReview = async (status: 'Approved' | 'Rejected') => {

    const tid = toast(`Submitting ${status.toLowerCase()}...`, 'info', 120000);
    try {
      const res = await fetch(`/api/inventory/goods-receipts/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, comments })
      });
      
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || 'Failed to submit review');
      }
      
      toast(`Goods receipt ${status} successfully`, 'success');
      
      if (status === 'Approved') {
        const verifyLink = `${window.location.origin}/verify/goods-receipt/${id}`;
        setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(verifyLink)}`);
        setData((prev: any) => ({ ...prev, status: 'Approved' }));
      } else {
        router.push('/inventory/goods-receipts');
      }
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      dismissToast(tid);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!data) return null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/inventory/goods-receipts')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Review Goods Receipt</h2>
          <p className="text-slate-500 mt-1">{data.receiptNo}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Receipt Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-slate-500 block">Insight PO Number</span><span className="font-medium">{data.insightPoNumber || 'N/A'}</span></div>
              <div><span className="text-slate-500 block">Supplier</span><span className="font-medium">{data.supplierName}</span></div>
              <div><span className="text-slate-500 block">Delivery Note</span><span className="font-medium">{data.deliveryNoteNumber || 'N/A'}</span></div>
              <div><span className="text-slate-500 block">Invoice Number</span><span className="font-medium">{data.invoiceNumber || 'N/A'}</span></div>
              <div><span className="text-slate-500 block">Date Received</span><span className="font-medium">{new Date(data.receivedAt).toLocaleString()}</span></div>
              <div><span className="text-slate-500 block">Captured By</span><span className="font-medium">{data.capturedBy || 'N/A'}</span></div>
            </div>

            <Separator />
            <h4 className="font-semibold">Line Items</h4>
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Damaged</TableHead>
                    <TableHead className="text-right font-bold text-emerald-700">Accepted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.lines.map((line: any) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        <div className="font-medium">{line.productName}</div>
                        {line.remarks && <div className="text-xs text-slate-500 mt-1">Note: {line.remarks}</div>}
                      </TableCell>
                      <TableCell className="text-right">{parseFloat(line.orderedQty)}</TableCell>
                      <TableCell className="text-right">{parseFloat(line.quantity)}</TableCell>
                      <TableCell className="text-right text-red-600">{parseFloat(line.damagedQty)}</TableCell>
                      <TableCell className="text-right font-bold text-emerald-700">{parseFloat(line.acceptedQty)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {data.attachments && data.attachments.length > 0 && (
              <>
                <Separator />
                <h4 className="font-semibold">Attached Documents</h4>
                <div className="flex flex-wrap gap-3">
                  {data.attachments.map((att: any, idx: number) => (
                    <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 border rounded-md hover:bg-slate-50">
                      <FileText className="h-5 w-5 text-mine-blue-600" />
                      <span className="text-sm font-medium">{att.name}</span>
                      <Download className="h-4 w-4 ml-2 text-slate-400" />
                    </a>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Supervisor Review</CardTitle>
              <CardDescription>Verify details and sign to approve</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Review Comments</label>
                <textarea 
                  className="w-full border rounded-md p-2 text-sm min-h-[100px]" 
                  placeholder="Add any notes about this delivery..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  disabled={data.status !== 'Pending Review'}
                />
              </div>

              {data.status === 'Pending Review' ? null : (
                <div>
                  <label className="block text-sm font-medium mb-1">Verification QR Code</label>
                  <div className="border rounded-md bg-white p-4 flex flex-col items-center justify-center">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + '/verify/goods-receipt/' + id : '')}`}
                      alt="Verification QR Code" 
                      className="w-48 h-48 object-contain mb-4" 
                    />
                    <p className="text-sm font-medium text-slate-700">Scan to Verify Receipt</p>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 text-center">
                    Reviewed by {data.reviewedBy} on {new Date(data.approvedAt || data.updatedAt).toLocaleString()}
                  </p>
                </div>
              )}

              {data.status === 'Pending Review' && (
                <div className="flex flex-col gap-2 pt-4">
                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => submitReview('Approved')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" /> Approve & Generate QR
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => submitReview('Rejected')}
                  >
                    <XCircle className="h-4 w-4 mr-2" /> Reject Receipt
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

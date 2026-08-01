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
  const [signature, setSignature] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

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

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#000';
    }
  };

  useEffect(() => {
    if (!loading) {
      setTimeout(initCanvas, 100);
    }
  }, [loading]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (canvas) {
        setSignature(canvas.toDataURL('image/png'));
      }
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setSignature('');
    }
  };

  const submitReview = async (status: 'Approved' | 'Rejected') => {
    if (status === 'Approved' && !signature) {
      toast('Electronic signature is required for approval', 'error');
      return;
    }

    const tid = toast(`Submitting ${status.toLowerCase()}...`, 'info', 120000);
    try {
      const res = await fetch(`/api/inventory/goods-receipts/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, comments, signature })
      });
      
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || 'Failed to submit review');
      }
      
      toast(`Goods receipt ${status} successfully`, 'success');
      router.push('/inventory/goods-receipts');
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

              {data.status === 'Pending Review' ? (
                <div>
                  <label className="block text-sm font-medium mb-1 flex justify-between">
                    <span>Electronic Signature *</span>
                    <button type="button" onClick={clearSignature} className="text-xs text-mine-blue-600 hover:underline">Clear</button>
                  </label>
                  <div className="border-2 border-dashed rounded-md bg-slate-50 relative">
                    <canvas 
                      ref={canvasRef}
                      width={300} 
                      height={150} 
                      className="w-full cursor-crosshair touch-none"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseOut={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                    {!signature && !isDrawing && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-sm">
                        Draw signature here
                      </div>
                    )}
                  </div>
                </div>
              ) : data.reviewerSignature ? (
                <div>
                  <label className="block text-sm font-medium mb-1">Signature</label>
                  <div className="border rounded-md bg-white p-2">
                    <img src={data.reviewerSignature} alt="Signature" className="max-h-24 object-contain" />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Reviewed by {data.reviewedBy} on {new Date(data.approvedAt || data.updatedAt).toLocaleString()}
                  </p>
                </div>
              ) : null}

              {data.status === 'Pending Review' && (
                <div className="flex flex-col gap-2 pt-4">
                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => submitReview('Approved')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" /> Approve & Update Inventory
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

'use client';

import { toast } from '@/components/ui/toast';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, Package, Save } from 'lucide-react';
import Link from 'next/link';

interface BackOrderLine {
  id: string;
  productId: string;
  productName: string;
  requestedQty: string;
  allocatedQty: string;
  outstandingQty: string;
  availableStock: number;
}

interface BackOrder {
  id: string;
  orderNumber: string;
  branch: { name: string };
  status: string;
  createdAt: string;
  requestedBy: string;
  lines: BackOrderLine[];
}

export default function ReviewBackOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [order, setOrder] = useState<BackOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [fulfillLines, setFulfillLines] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/warehouse/back-orders/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          toast('Failed to load back order', 'error');
        } else {
          setOrder(data);
          const initialFulfill: Record<string, number> = {};
          data.lines.forEach((l: BackOrderLine) => {
            const out = Number(l.outstandingQty);
            const avail = l.availableStock;
            // Default fulfillment is the minimum of what's outstanding and what's available
            initialFulfill[l.id] = Math.min(out, avail);
          });
          setFulfillLines(initialFulfill);
        }
        setLoading(false);
      });
  }, [id]);

  const handleQtyChange = (lineId: string, val: string) => {
    const num = parseInt(val, 10);
    setFulfillLines(prev => ({
      ...prev,
      [lineId]: isNaN(num) ? 0 : num
    }));
  };

  const handleFulfill = async () => {
    setIsSubmitting(true);
    try {
      const payload = Object.keys(fulfillLines).map(lineId => ({
        lineId,
        fulfillQty: fulfillLines[lineId]
      })).filter(l => l.fulfillQty > 0);

      if (payload.length === 0) {
        toast('No quantities specified for fulfillment', 'error');
        setIsSubmitting(false);
        return;
      }

      const res = await fetch(`/api/warehouse/back-orders/${id}/fulfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines: payload }),
      });

      if (res.ok) {
        toast('Back order fulfilled successfully. Stock transfer generated.', 'success');
        router.push('/warehouse/back-orders');
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to fulfill back order', 'error');
      }
    } catch (e) {
      toast('Network error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!order) return <div className="p-6">Back order not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/warehouse/back-orders')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Review Back Order</h2>
          <p className="text-slate-500 mt-1">Order #{order.orderNumber}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Fulfillment Items</CardTitle>
              <CardDescription>Allocate available DC warehouse stock to this back order</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-right">DC Stock</TableHead>
                    <TableHead className="text-right w-32">Fulfill Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.lines.map((line) => {
                    const outstanding = Number(line.outstandingQty);
                    const isFulfilled = outstanding <= 0;
                    return (
                      <TableRow key={line.id} className={isFulfilled ? "opacity-50" : ""}>
                        <TableCell>
                          <p className="font-medium">{line.productName}</p>
                          <p className="text-xs text-slate-500 font-mono">{line.productId}</p>
                        </TableCell>
                        <TableCell className="text-right">{outstanding}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={line.availableStock > 0 ? 'success' : 'destructive'}>
                            {line.availableStock} in DC
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Input 
                            type="number" 
                            min="0"
                            max={Math.min(outstanding, line.availableStock)}
                            value={fulfillLines[line.id] || 0}
                            onChange={(e) => handleQtyChange(line.id, e.target.value)}
                            disabled={isFulfilled || line.availableStock <= 0}
                            className="text-right"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="mt-6 flex justify-end">
                <Button onClick={handleFulfill} disabled={isSubmitting || ['closed', 'fulfilled', 'allocated'].includes(order.status)}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Processing...' : 'Confirm Fulfillment'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Requesting Branch</p>
                <p className="font-medium">{order.branch.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Status</p>
                <Badge className="mt-1">{order.status}</Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Requested By</p>
                <p>{order.requestedBy}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Date Created</p>
                <p>{new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

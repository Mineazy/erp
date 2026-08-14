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
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Store, Plus, Search, Eye, Trash2, CheckCircle, PackageOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface LineItem {
  productId: string;
  productName: string;
  quantity: string;
}

export default function BranchOrdersPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [receivedLines, setReceivedLines] = useState<{lineId: string; receivedQty: string}[]>([]);

  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineItem[]>([{ productId: '', productName: '', quantity: '1' }]);
  
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [myBranchId, setMyBranchId] = useState<string>(''); // For simplicity, we might just assume the backend infers it, but the POST requires toBranchId.
  // Wait, the API requires toBranchId. Let's fetch branches.
  const [branches, setBranches] = useState<any[]>([]);
  const [toBranchId, setToBranchId] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/inventory/branch-orders?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json.items || []);
    } catch {
      toast('Failed to fetch orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search, statusFilter]);

  useEffect(() => {
    fetch('/api/inventory/products?limit=200').then(async r => { if (r.ok) { const d = await r.json(); setProducts(d.items || []); } }).catch(() => {});
    fetch('/api/warehouse?limit=100').then(async r => { if (r.ok) { const d = await r.json(); setWarehouses(d.items || []); } }).catch(() => {});
    fetch('/api/warehouse/branches?limit=100').then(async r => { if (r.ok) { const d = await r.json(); setBranches(d.items || []); } }).catch(() => {});
  }, []);

  const handleOpenNew = () => {
    const dc = warehouses.find(w => w.name?.toLowerCase().includes('dc') || w.code?.toLowerCase() === 'dc');
    setFromWarehouseId(dc ? dc.id : '');
    setToBranchId('');
    setNotes('');
    setLines([{ productId: '', productName: '', quantity: '1' }]);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!fromWarehouseId || !toBranchId) {
      toast('Please select a Warehouse and your Branch', 'error');
      return;
    }
    const invalidLines = lines.some(l => !l.productId || !l.quantity || Number(l.quantity) <= 0);
    if (invalidLines) {
      toast('Please select a product and valid quantities for all lines', 'error');
      return;
    }

    const tid = toast('Creating stock order...', 'info', 120000);
    try {
      const payload = {
        fromWarehouseId,
        toBranchId,
        notes,
        lines: lines.map(l => ({ ...l, unitPrice: 0 }))
      };
      
      const res = await fetch('/api/inventory/branch-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Failed to save');
      }

      toast('Order created successfully', 'success');
      setDialogOpen(false);
      fetchData();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      dismissToast(tid);
    }
  };

  const handleOpenReceive = (order: any) => {
    setSelectedOrder(order);
    setReceivedLines(order.lines.map((l: any) => ({ lineId: l.id, receivedQty: l.quantity })));
    setReceiveDialogOpen(true);
  };

  const handleReceiveSubmit = async () => {
    if (!selectedOrder) return;
    const tid = toast('Receiving stock...', 'info', 120000);
    try {
      const res = await fetch(`/api/inventory/stock/transfers/${selectedOrder.id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receivedLines: receivedLines.map(rl => ({ lineId: rl.lineId, receivedQty: Number(rl.receivedQty) }))
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Failed to receive order');
      }

      toast('Stock received successfully', 'success');
      setReceiveDialogOpen(false);
      fetchData();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      dismissToast(tid);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Branch Stock Orders</h2>
          <p className="text-slate-500 mt-1">Request stock from warehouses and manage incoming deliveries</p>
        </div>
        <Button onClick={handleOpenNew} className="bg-mine-blue-600 hover:bg-mine-blue-700">
          <Plus className="h-4 w-4 mr-2" /> New Stock Order
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-mine-blue-600" />
              Order History
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
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400">No stock orders found</TableCell></TableRow>
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
                        {item.status === 'in_transit' ? (
                          <Button variant="ghost" size="sm" onClick={() => handleOpenReceive(item)}>
                            <PackageOpen className="h-4 w-4 mr-1 text-emerald-600" />
                            Receive
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-1 text-mine-blue-600" />
                            View
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

      {/* Create Order Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-bold mb-4">Create Branch Stock Order</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <Label>Request From Warehouse *</Label>
              <Select value={fromWarehouseId} onChange={e => setFromWarehouseId(e.target.value)}>
                <option value="">Select Warehouse...</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
            </div>
            <div>
              <Label>Your Branch *</Label>
              <Select value={toBranchId} onChange={e => setToBranchId(e.target.value)}>
                <option value="">Select Branch...</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Notes (Optional)</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Urgent order, etc." />
            </div>
          </div>

          <Separator className="my-4" />
          <h4 className="font-semibold mb-3">Line Items</h4>
          <div className="border rounded-md overflow-x-auto mb-4">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="w-32">Quantity</TableHead>
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
                    <TableCell>
                      <Input type="number" min="1" value={line.quantity} onChange={e => { const l=[...lines]; l[index].quantity=e.target.value; setLines(l); }} />
                    </TableCell>
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
          <Button variant="outline" size="sm" onClick={() => setLines([...lines, { productId: '', productName: '', quantity: '1' }])}>+ Add Product</Button>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-mine-blue-600 hover:bg-mine-blue-700">Submit Order</Button>
          </DialogFooter>
        </div>
      </Dialog>
      
      {/* Receive Order Dialog */}
      <Dialog open={receiveDialogOpen} onClose={() => setReceiveDialogOpen(false)} className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-bold mb-4">Receive Stock Order {selectedOrder?.transferNo}</h3>
          <p className="text-slate-500 mb-4 text-sm">Please verify the quantities received. Any discrepancies will remain in the L99 Transit Warehouse for manual investigation.</p>
          
          <div className="border rounded-md overflow-x-auto mb-4">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Shipped Qty</TableHead>
                  <TableHead className="w-32">Received Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedOrder?.lines.map((line: any, index: number) => (
                  <TableRow key={line.id}>
                    <TableCell>{line.productName}</TableCell>
                    <TableCell>{line.quantity}</TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        min="0" 
                        max={line.quantity}
                        value={receivedLines.find(rl => rl.lineId === line.id)?.receivedQty || '0'} 
                        onChange={e => { 
                          const updated = [...receivedLines];
                          const idx = updated.findIndex(rl => rl.lineId === line.id);
                          if (idx >= 0) updated[idx].receivedQty = e.target.value;
                          setReceivedLines(updated); 
                        }} 
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setReceiveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleReceiveSubmit} className="bg-emerald-600 hover:bg-emerald-700">Confirm Receipt</Button>
          </DialogFooter>
        </div>
      </Dialog>

    </div>
  );
}

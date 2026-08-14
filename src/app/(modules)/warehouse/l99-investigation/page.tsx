'use client';

import { toast, dismissToast } from '@/components/ui/toast';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Search, AlertTriangle, Undo2 } from 'lucide-react';
import { Select } from '@/components/ui/select';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export default function L99InvestigationPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [returnLines, setReturnLines] = useState<Record<string, string>>({});
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  
  const [warehouses, setWarehouses] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/inventory/l99-investigation?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json.items || []);
    } catch {
      toast('Failed to fetch L99 transit stock', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search]);

  useEffect(() => {
    fetch('/api/warehouse?limit=100').then(async r => { 
      if (r.ok) { 
        const d = await r.json(); 
        setWarehouses((d.items || []).filter((w: any) => w.code !== 'L99')); 
      } 
    }).catch(() => {});
  }, []);

  const handleOpenReturn = (transfer: any) => {
    setSelectedStock(transfer);
    const initialLines: Record<string, string> = {};
    transfer.lines?.forEach((l: any) => {
      initialLines[l.id] = l.quantity.toString();
    });
    setReturnLines(initialLines);
    setTargetWarehouseId('');
    setNotes('');
    setReturnDialogOpen(true);
  };

  const handleReturnSubmit = async () => {
    if (!targetWarehouseId) {
      toast('Please select a target warehouse', 'error');
      return;
    }
    
    const linesToReturn = Object.entries(returnLines)
      .map(([lineId, qty]) => ({ lineId, returnQty: Number(qty) }))
      .filter(l => l.returnQty > 0);

    if (linesToReturn.length === 0) {
      toast('Please enter return quantities for at least one item', 'error');
      return;
    }

    const tid = toast('Returning stock...', 'info', 120000);
    try {
      const payload = {
        transferId: selectedStock.id,
        linesToReturn,
        targetWarehouseId,
        notes
      };
      
      const res = await fetch('/api/inventory/l99-investigation/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Failed to return stock');
      }

      toast('Stock returned successfully', 'success');
      setReturnDialogOpen(false);
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
          <h2 className="text-2xl font-bold text-slate-900">L99 Transit Discrepancies</h2>
          <p className="text-slate-500 mt-1">Investigate and resolve stock stuck in L99 Transit Warehouse</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              L99 Stock Registry
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Search product or batch..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Order No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">Loading...</TableCell></TableRow>
                ) : data.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">No branch orders stuck in L99</TableCell></TableRow>
                ) : (
                  data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.transferNo}</TableCell>
                      <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{item.fromWarehouse?.name || 'N/A'}</TableCell>
                      <TableCell>{item.toBranch?.name || 'N/A'}</TableCell>
                      <TableCell>{item.requestedBy}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenReturn(item)}>
                          <Undo2 className="h-4 w-4 mr-1 text-mine-blue-600" />
                          Return Order
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

      {/* Return Dialog */}
      <Dialog open={returnDialogOpen} onClose={() => setReturnDialogOpen(false)}>
        <div className="p-6 max-w-2xl w-full">
          <h3 className="text-lg font-bold mb-4">Return Order from L99</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Order No</Label>
                <p className="text-sm font-medium">{selectedStock?.transferNo}</p>
              </div>
              <div>
                <Label>Target Warehouse</Label>
                <Select value={targetWarehouseId} onChange={e => setTargetWarehouseId(e.target.value)}>
                  <option value="">Select Warehouse...</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </Select>
              </div>
            </div>
            
            <div className="mt-4">
              <Label className="mb-2 block">Items to Return</Label>
              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                {selectedStock?.lines?.map((line: any) => (
                  <div key={line.id} className="flex items-center gap-3 border p-3 rounded bg-slate-50">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{line.productName}</p>
                      <p className="text-xs text-slate-500">Max: {line.quantity}</p>
                    </div>
                    <div className="w-24">
                      <Input 
                        type="number" 
                        min="0" 
                        max={line.quantity} 
                        value={returnLines[line.id] || ''} 
                        onChange={(e) => setReturnLines({...returnLines, [line.id]: e.target.value})} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Investigation Notes</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Found in truck, returned to main..." />
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleReturnSubmit} className="bg-mine-blue-600 hover:bg-mine-blue-700">Confirm Return</Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}

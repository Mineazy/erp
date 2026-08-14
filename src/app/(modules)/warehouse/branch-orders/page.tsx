'use client';

import { toast, dismissToast } from '@/components/ui/toast';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Store, Search, Eye, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function WarehouseBranchOrdersPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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
                        {item.status === 'pending' || item.status === 'draft' ? (
                          <Button variant="ghost" size="sm" onClick={() => handleProcess(item.id)}>
                            <Send className="h-4 w-4 mr-1 text-mine-blue-600" />
                            Process
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-1 text-slate-600" />
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
    </div>
  );
}

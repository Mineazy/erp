'use client';

import { toast } from '@/components/ui/toast';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Package, AlertTriangle, TrendingUp, ArrowUpDown, Warehouse, DollarSign, BarChart3, RefreshCw, Search } from 'lucide-react';

interface DashboardData {
  totalProducts: number;
  totalStockQty: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  recentMovements: number;
  forecastsAvailable: boolean;
  branchSummary: { id: string; branch: string; productCount: number; stockQty: number; value: number }[];
}

export default function InventoryDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedBranch, setSelectedBranch] = useState<{ id: string, branch: string } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [inventoryPage, setInventoryPage] = useState(1);
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryData, setInventoryData] = useState<any>(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/inventory/dashboard');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch dashboard', e);
      toast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const fetchInventory = async (branchId: string, page = 1, search = '') => {
    try {
      setInventoryLoading(true);
      const res = await fetch(`/api/inventory/products?branchId=${branchId}&page=${page}&limit=10&search=${search}&sort=category`);
      if (res.ok) {
        const json = await res.json();
        setInventoryData(json);
      }
    } catch (e) {
      console.error(e);
      toast('Failed to load inventory', 'error');
    } finally {
      setInventoryLoading(false);
    }
  };

  const openBranchModal = (branch: { id: string, branch: string }) => {
    setSelectedBranch(branch);
    setInventoryPage(1);
    setInventorySearch('');
    fetchInventory(branch.id, 1, '');
    setModalOpen(true);
  };

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Inventory Dashboard</h2>
          <p className="text-slate-500 mt-1">Overview of your inventory metrics</p>
        </div>
        <Button variant="outline" onClick={fetchDashboard}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Products</p>
              <p className="text-xl font-bold text-slate-900">{data?.totalProducts ?? 0}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg"><Package className="h-5 w-5 text-blue-600" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Stock Quantity</p>
              <p className="text-xl font-bold text-slate-900">{(data?.totalStockQty ?? 0).toLocaleString()}</p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg"><Warehouse className="h-5 w-5 text-green-600" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Inventory Value</p>
              <p className="text-xl font-bold text-slate-900">${(data?.totalValue ?? 0).toLocaleString()}</p>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg"><DollarSign className="h-5 w-5 text-purple-600" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Low Stock Items</p>
              <p className="text-xl font-bold text-amber-600">{data?.lowStockCount ?? 0}</p>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Out of Stock Items</p>
              <p className="text-xl font-bold text-red-600">{data?.outOfStockCount ?? 0}</p>
            </div>
            <div className="p-2 bg-red-50 rounded-lg"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Recent Movements</p>
              <p className="text-xl font-bold text-slate-900">{data?.recentMovements ?? 0}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg"><ArrowUpDown className="h-5 w-5 text-blue-600" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Forecasts Available</p>
              <p className="text-xl font-bold text-slate-900">{data?.forecastsAvailable ? 'Yes' : 'No'}</p>
            </div>
            <div className="p-2 bg-teal-50 rounded-lg"><BarChart3 className="h-5 w-5 text-teal-600" /></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-mine-blue-800" />
            Branch Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch</TableHead>
                <TableHead className="text-right">Products</TableHead>
                <TableHead className="text-right">Stock Qty</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.branchSummary?.length ? data.branchSummary.map((b, i) => (
                <TableRow key={i} className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => openBranchModal(b)}>
                  <TableCell className="font-medium">{b.branch}</TableCell>
                  <TableCell className="text-right">{b.productCount}</TableCell>
                  <TableCell className="text-right font-mono">{b.stockQty.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono">${b.value.toLocaleString()}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-400 py-4">No branch data available</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-mine-blue-800" />
            Quick Links
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => window.location.href = '/inventory/products'}>
              <Package className="h-4 w-4 mr-2" />Products
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/inventory/adjustments'}>
              <ArrowUpDown className="h-4 w-4 mr-2" />Stock Adjustments
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/inventory/transfers'}>
              <ArrowUpDown className="h-4 w-4 mr-2" />Stock Transfers
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/inventory/counts'}>
              <Warehouse className="h-4 w-4 mr-2" />Stock Counts
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/inventory/forecasting'}>
              <BarChart3 className="h-4 w-4 mr-2" />Forecasting
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/inventory/alerts'}>
              <AlertTriangle className="h-4 w-4 mr-2" />Alerts
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} title={`Inventory: ${selectedBranch?.branch}`} className="max-w-4xl">
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text"
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-sm"
                placeholder="Search inventory by name or code... (Press Enter)" 
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                onKeyDown={(e) => {
                   if (e.key === 'Enter' && selectedBranch) {
                      setInventoryPage(1);
                      fetchInventory(selectedBranch.id, 1, inventorySearch);
                   }
                }}
              />
            </div>
            <Button onClick={() => {
              if (selectedBranch) {
                setInventoryPage(1);
                fetchInventory(selectedBranch.id, 1, inventorySearch);
              }
            }}>
              Search
            </Button>
          </div>
          
          {inventoryLoading ? (
            <div className="py-8 text-center text-slate-500">Loading inventory data...</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Stock Qty</TableHead>
                    <TableHead className="text-right">Cost Price</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryData?.items?.length ? inventoryData.items.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.code}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.category?.name || 'Uncategorized'}</TableCell>
                      <TableCell className="text-right">{p.stock}</TableCell>
                      <TableCell className="text-right">${Number(p.costPrice).toLocaleString()}</TableCell>
                      <TableCell className="text-right">${(Number(p.stock) * Number(p.costPrice)).toLocaleString()}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-slate-400">No products found for this branch.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              
              {inventoryData && inventoryData.total > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-slate-500">
                    Showing {(inventoryData.page - 1) * inventoryData.limit + 1} to {Math.min(inventoryData.page * inventoryData.limit, inventoryData.total)} of {inventoryData.total}
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={inventoryData.page <= 1}
                      onClick={() => {
                        const newPage = inventoryPage - 1;
                        setInventoryPage(newPage);
                        fetchInventory(selectedBranch!.id, newPage, inventorySearch);
                      }}
                    >
                      Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={inventoryData.page * inventoryData.limit >= inventoryData.total}
                      onClick={() => {
                        const newPage = inventoryPage + 1;
                        setInventoryPage(newPage);
                        fetchInventory(selectedBranch!.id, newPage, inventorySearch);
                      }}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Dialog>
    </div>
  );
}

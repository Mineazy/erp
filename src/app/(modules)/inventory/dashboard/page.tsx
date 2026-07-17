'use client';

import { toast } from '@/components/ui/toast';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Package, AlertTriangle, TrendingUp, ArrowUpDown, Warehouse, DollarSign, BarChart3, RefreshCw } from 'lucide-react';

interface DashboardData {
  totalProducts: number;
  totalStockQty: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  recentMovements: number;
  forecastsAvailable: boolean;
  branchSummary: { branch: string; productCount: number; stockQty: number; value: number }[];
}

export default function InventoryDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

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
                <TableRow key={i}>
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
    </div>
  );
}

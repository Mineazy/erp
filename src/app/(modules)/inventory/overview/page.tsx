'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { TrendingUp, TrendingDown, AlertCircle, DollarSign, Search, Layout } from 'lucide-react';
import { Table, TableHeader, TableRow, TableCell, TableBody } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

export default function InventoryOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState<{value: string, label: string}[]>([]);

  useEffect(() => {
    fetchBranches();
    fetchDashboard();
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [branchId]);

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/admin/branches');
      if (res.ok) {
        const result = await res.json();
        const opts = result.items ? result.items.map((b: any) => ({ value: b.id, label: b.name })) : [];
        setBranches([{ value: '', label: 'Overall (All Branches)' }, ...opts]);
      }
    } catch (e) {
      console.error('Failed to fetch branches', e);
    }
  };

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (branchId) params.append('branchId', branchId);
      
      const res = await fetch(`/api/inventory/dashboard?${params.toString()}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (e) {
      console.error('Failed to fetch inventory dashboard', e);
    }
    setLoading(false);
  };

  const formatNum = (val: number | undefined | null) => Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

  if (loading && !data) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mine-blue-600"></div>
      </div>
    );
  }

  const { totalProducts = 0, totalStockQty = 0, totalValue = 0, lowStockCount = 0, outOfStockCount = 0, recentMovements = 0, branchSummary = [], categorySummary = [], forecastsAvailable = false } = data || {};

  // Helper to determine stock status badge
  const statusBadge = (qty: number, minQty: number) => {
    if (qty <= 0) return <Badge variant="destructive">Out of Stock</Badge>;
    if (qty <= minQty) return <Badge variant="warning">Low Stock</Badge>;
    return <Badge variant="success">Available</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventory Overview</h1>
          <p className="text-sm text-slate-500">High-level view of current stock and inventory valuation.</p>
        </div>
        <div className="w-full md:w-64">
          <Select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            options={branches}
            placeholder="Filter by Branch"
            className="w-full bg-white shadow-sm"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-slate-600">Total Products</p>
              <div className="p-2 bg-slate-50 rounded-full">
                <Layout className="h-4 w-4 text-slate-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{totalProducts}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-slate-600">Total Stock Qty</p>
              <div className="p-2 bg-emerald-50 rounded-full">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{formatNum(totalStockQty)}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-slate-600">Inventory Value</p>
              <div className="p-2 bg-mine-blue-50 rounded-full">
                <DollarSign className="h-4 w-4 text-mine-blue-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalValue)}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-slate-600">Low Stock Items</p>
              <div className="p-2 bg-orange-50 rounded-full">
                <AlertCircle className="h-4 w-4 text-orange-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900" style={{ color: '#ef4444' }}>
              {lowStockCount}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-slate-600">Out of Stock Items</p>
              <div className="p-2 bg-red-50 rounded-full">
                <AlertCircle className="h-4 w-4 text-red-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900" style={{ color: '#dc2626' }}>
              {outOfStockCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-slate-600">Recent Movements (30d)</p>
              <div className="p-2 bg-slate-50 rounded-full">
                <TrendingUp className="h-4 w-4 text-slate-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{recentMovements}</div>
          </CardContent>
        </Card>
      </div>

      {/* Branch Stock Table */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800">Stock by Branch</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell>Branch</TableCell>
                  <TableCell>Products</TableCell>
                  <TableCell>Stock Qty</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branchSummary.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell>{b.branch || 'Unknown'}</TableCell>
                    <TableCell>{b.productCount || 0}</TableCell>
                    <TableCell>{formatNum(b.stockQty)}</TableCell>
                    <TableCell>{formatCurrency(b.value)}</TableCell>
                    <TableCell>
                      {statusBadge(b.stockQty, b.minQuantity || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {branchSummary.length === 0 && <p className="text-slate-400 text-sm text-center py-4">No branch data available</p>}
        </CardContent>
      </Card>

      {/* Category Summary */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800">Stock by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {categorySummary.length > 0 ? (
            <div className="space-y-2">
              {categorySummary.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between py-1">
                  <span className="text-slate-700">{c.name || 'Uncategorized'}</span>
                  <span className="text-sm text-slate-500">
                    {c.productCount} products
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-8">No category data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
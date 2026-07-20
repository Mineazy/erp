'use client';

import { toast } from '@/components/ui/toast';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileBarChart, Download, Package, DollarSign, TrendingUp, TrendingDown, AlertTriangle, Scale, Calendar, Landmark } from 'lucide-react';

interface Branch {
  id: string;
  code: string;
  name: string;
}

const reportTypes = [
  { value: 'stock-on-hand', label: 'Stock on Hand' },
  { value: 'valuation', label: 'Inventory Valuation' },
  { value: 'movements', label: 'Stock Movements' },
  { value: 'fast-moving', label: 'Fast Moving Items' },
  { value: 'slow-moving', label: 'Slow Moving Items' },
  { value: 'dead-stock', label: 'Dead Stock' },
  { value: 'turnover', label: 'Turnover Analysis' },
  { value: 'aging', label: 'Stock Aging' },
  { value: 'restock-prediction', label: 'Restock & Forecasting Predictions' },
];

const columns: Record<string, string[]> = {
  'stock-on-hand': ['Product', 'Code', 'Category', 'Stock', 'Min Stock', 'Value', 'Status'],
  valuation: ['Product', 'Stock', 'Cost Price', 'Value'],
  movements: ['Movement No', 'Product', 'Type', 'Quantity', 'Reference', 'Date'],
  'fast-moving': ['Product', 'Quantity Sold', 'Value', 'Rank'],
  'slow-moving': ['Product', 'Stock', 'Last Movement', 'Days'],
  'dead-stock': ['Product', 'Stock', 'Last Movement', 'Days Inactive'],
  turnover: ['Product', 'Turnover Ratio', 'Avg Stock', 'Sold Qty'],
  aging: ['Product', 'Batch', 'Expiry Date', 'Quantity', 'Status'],
  'restock-prediction': ['Product', 'Code', 'Current Stock', 'Daily Velocity', 'Days Remaining', 'Recommended Restock Qty', 'Predicted Restock Date', 'Status'],
};

export default function InventoryReportsPage() {
  const [reportType, setReportType] = useState('stock-on-hand');
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalProducts: 0, totalValue: 0, lowStock: 0, outOfStock: 0 });
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('consolidated');
  const [branches, setBranches] = useState<Branch[]>([]);

  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/admin/branches');
      if (res.ok) {
        const json = await res.json();
        setBranches(json.data || json);
      }
    } catch (_) {}
  };

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ reportType });
      if (selectedBranch !== 'consolidated') {
        params.set('branchId', selectedBranch);
      }
      if (reportType === 'movements') {
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
      }
      const res = await fetch(`/api/inventory/reports?${params}`);
      if (!res.ok) throw new Error('Failed to fetch report');
      const json = await res.json();
      const items = json.items ?? json.data ?? json.report ?? [];
      setData(items);
      
      if (json.summary) {
        setSummary(json.summary);
      } else {
        // Fallback client-side summary calculation
        const totalProducts = items.length;
        const totalValue = items.reduce((sum: number, item: any) => sum + (Number(item.valuation || item.value || (item.stock * item.costPrice) || 0)), 0);
        const lowStock = items.filter((item: any) => item.status === 'low_stock' || item.status === 'Low Stock' || item.current_stock <= 10).length;
        const outOfStock = items.filter((item: any) => item.status === 'out_of_stock' || item.status === 'Out of Stock' || item.current_stock === 0).length;
        setSummary({ totalProducts, totalValue, lowStock, outOfStock });
      }
    } catch {
      toast('Failed to load report', 'error');
    } finally {
      setLoading(false);
    }
  }, [reportType, startDate, endDate, selectedBranch]);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (reportType !== 'movements') {
      setStartDate('');
      setEndDate('');
    } else {
      if (!startDate) setStartDate(thirtyDaysAgo);
      if (!endDate) setEndDate(today);
    }
    fetchReport();
  }, [reportType, selectedBranch]);

  const handleSearch = () => fetchReport();

  const exportCSV = () => {
    if (!data.length) return;
    const cols = columns[reportType] || [];
    const rows = data.map((row) =>
      cols.map((col) => {
        const key = col.toLowerCase().replace(/\s+/g, '_');
        const val = row[key] ?? row[col] ?? '';
        return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
      }).join(',')
    );
    const csv = [cols.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderValue = (row: any, col: string, idx: number) => {
    const key = col.toLowerCase().replace(/\s+/g, '_');
    const val = row[key] ?? row[col] ?? '';
    
    if (col === 'Status') {
      const lowerVal = String(val).toLowerCase();
      if (lowerVal === 'out_of_stock' || lowerVal === 'expired' || lowerVal === 'out of stock' || lowerVal === 'urgent restock') {
        return <Badge variant="destructive">{val}</Badge>;
      }
      if (lowerVal === 'low_stock' || lowerVal === 'low stock' || lowerVal === 'reorder soon') {
        return <Badge variant="warning">{val}</Badge>;
      }
      if (lowerVal === 'active' || lowerVal === 'good') {
        return <Badge variant="success">{val}</Badge>;
      }
      return <Badge>{val}</Badge>;
    }
    
    if (col === 'Type' && row.type) {
      if (row.type === 'IN') return <Badge variant="success">IN</Badge>;
      if (row.type === 'OUT') return <Badge variant="destructive">OUT</Badge>;
      return <Badge>{row.type}</Badge>;
    }
    
    if (col === 'Value' || col === 'Cost Price' || (val?.toString().startsWith?.('$') === false && !isNaN(Number(val)) && (col.includes('Price') || col.includes('Value')))) {
      const num = Number(val);
      if (!isNaN(num)) return `$${num.toLocaleString()}`;
    }

    if (col === 'Daily Velocity') {
      return `${val} units/day`;
    }

    if (col === 'Days Remaining') {
      return val === '∞' ? '∞' : `${val} days`;
    }
    
    return val;
  };

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileBarChart className="h-6 w-6 text-mine-blue-800" />
            Inventory Reports & Analytics
          </h2>
          <p className="text-slate-500 mt-1">
            {selectedBranch === 'consolidated' ? 'Consolidated Reports' : `Reports disaggregated by ${branches.find(b => b.id === selectedBranch)?.name || 'Branch'}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <FileBarChart className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Products</p>
              <p className="text-xl font-bold text-slate-900">{summary.totalProducts}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg"><Package className="h-5 w-5 text-blue-800" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Value</p>
              <p className="text-xl font-bold text-slate-900">${summary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg"><DollarSign className="h-5 w-5 text-green-600" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Low Stock Items</p>
              <p className="text-xl font-bold text-amber-600">{summary.lowStock}</p>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Out of Stock</p>
              <p className="text-xl font-bold text-red-600">{summary.outOfStock}</p>
            </div>
            <div className="p-2 bg-red-50 rounded-lg"><TrendingDown className="h-5 w-5 text-red-600" /></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileBarChart className="h-5 w-5 text-mine-blue-800" />
                {reportTypes.find((r) => r.value === reportType)?.label}
              </CardTitle>
              <div className="w-56">
                <Select
                  options={reportTypes}
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                />
              </div>
              <div className="w-64">
                <Select
                  options={[{ value: 'consolidated', label: 'Consolidated (All Branches)' }, ...branches.map(b => ({ value: b.id, label: b.name }))]}
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                />
              </div>
            </div>
            {reportType === 'movements' && (
              <div className="flex items-center gap-2">
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
                <span className="text-slate-400">to</span>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
                <Button onClick={handleSearch}>Search</Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No data found for this report configuration.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {(columns[reportType] || []).map((col) => (
                    <TableHead key={col}>{col}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row: any, i: number) => (
                  <TableRow key={row.id ?? i}>
                    {(columns[reportType] || []).map((col, ci) => (
                      <TableCell key={ci}>{renderValue(row, col, ci)}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {reportType === 'valuation' && data.length > 0 && (
            <div className="mt-4 text-right text-sm font-semibold text-slate-700">
              Total Valuation: ${data.reduce((s: number, r: any) => s + (Number(r.valuation || r.value) || 0), 0).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

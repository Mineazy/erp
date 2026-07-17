'use client';

import { toast } from '@/components/ui/toast';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileBarChart, Download, Package, DollarSign, TrendingUp, TrendingDown, AlertTriangle, ArrowUpDown, Clock } from 'lucide-react';

const reportTypes = [
  { value: 'stock-on-hand', label: 'Stock on Hand' },
  { value: 'valuation', label: 'Inventory Valuation' },
  { value: 'movements', label: 'Stock Movements' },
  { value: 'fast-moving', label: 'Fast Moving Items' },
  { value: 'slow-moving', label: 'Slow Moving Items' },
  { value: 'dead-stock', label: 'Dead Stock' },
  { value: 'turnover', label: 'Turnover Analysis' },
  { value: 'aging', label: 'Stock Aging' },
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
};

export default function InventoryReportsPage() {
  const [reportType, setReportType] = useState('stock-on-hand');
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalProducts: 0, totalValue: 0, lowStock: 0, outOfStock: 0 });
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ reportType });
      if (reportType === 'movements') {
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
      }
      const res = await fetch(`/api/inventory/reports?${params}`);
      if (!res.ok) throw new Error('Failed to fetch report');
      const json = await res.json();
      setData(json.items ?? json.data ?? json.report ?? []);
      if (json.summary) setSummary(json.summary);
    } catch {
      toast('Failed to load report', 'error');
    } finally {
      setLoading(false);
    }
  }, [reportType, startDate, endDate]);

  useEffect(() => {
    if (reportType !== 'movements') {
      setStartDate('');
      setEndDate('');
    } else {
      if (!startDate) setStartDate(thirtyDaysAgo);
      if (!endDate) setEndDate(today);
    }
    fetchReport();
  }, [reportType]);

  const handleSearch = () => fetchReport();

  const exportCSV = () => {
    if (!data.length) return;
    const cols = columns[reportType] || [];
    const rows = data.map((row) =>
      cols.map((col) => {
        const val = row[col.toLowerCase().replace(/\s+/g, '_')] ?? row[col] ?? '';
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
      if (row.status === 'out_of_stock' || row.status === 'expired') return <Badge variant="destructive">{val}</Badge>;
      if (row.status === 'low_stock') return <Badge variant="warning">{val}</Badge>;
      if (row.status === 'active') return <Badge variant="success">{val}</Badge>;
      return <Badge>{val}</Badge>;
    }
    if (col === 'Type' && row.type) {
      if (row.type === 'IN') return <Badge variant="success">IN</Badge>;
      if (row.type === 'OUT') return <Badge variant="destructive">OUT</Badge>;
      return <Badge>{row.type}</Badge>;
    }
    if (col === 'Value' || col === 'Cost Price' || val?.toString().startsWith?.('$') === false && !isNaN(Number(val))) {
      const num = Number(val);
      if (!isNaN(num)) return `$${num.toLocaleString()}`;
    }
    return val;
  };

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Inventory Reports</h2>
          <p className="text-slate-500 mt-1">View and export inventory analysis reports</p>
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
              <p className="text-xl font-bold text-slate-900">${summary.totalValue.toLocaleString()}</p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg"><DollarSign className="h-5 w-5 text-green-600" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Low Stock</p>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileBarChart className="h-5 w-5 text-mine-blue-800" />
                {reportTypes.find((r) => r.value === reportType)?.label}
              </CardTitle>
              <div className="w-48">
                <Select
                  options={reportTypes}
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
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
            <div className="text-center py-12 text-slate-500">No data found for this report type.</div>
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
              Total Valuation: ${data.reduce((s: number, r: any) => s + (Number(r.value) || 0), 0).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

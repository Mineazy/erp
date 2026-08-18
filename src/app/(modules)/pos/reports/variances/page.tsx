'use client';

import { useState, useEffect } from 'react';
import { toast } from '@/components/ui/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Download, FileText, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { jsPDF } from 'jspdf';

export default function VariancesPage() {
  const [variances, setVariances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<any[]>([]);
  
  // Filters
  const [branchId, setBranchId] = useState('');
  const [cashier, setCashier] = useState('');
  const [date, setDate] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchVariances();
  }, [page, branchId, cashier, date]);

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/admin/branches');
      if (res.ok) {
        const data = await res.json();
        setBranches(Array.isArray(data) ? data : data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchVariances = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (branchId) params.append('branchId', branchId);
      if (cashier) params.append('cashier', cashier);
      if (date) params.append('date', date);

      const res = await fetch(`/api/pos/reports/variances?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch variances');
      const data = await res.json();
      
      setVariances(data.data || []);
      setTotalPages(data.meta?.totalPages || 1);
    } catch {
      toast('Failed to load variances', 'error');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async (v: any) => {
    try {
      const doc = new jsPDF();
      
      let logoBase64: string | null = null;
      try {
        const response = await fetch('/logo.png');
        if (response.ok) {
          const blob = await response.blob();
          logoBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      } catch (err) {
        console.error("Failed to load logo", err);
      }

      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', 14, 10, 40, 15);
      }
      
      doc.setFontSize(22);
      doc.text('Variance Report', 14, 35);
      
      doc.setFontSize(12);
      doc.text(`Report Date: ${new Date().toLocaleString()}`, 14, 45);
      doc.text(`Z-Report Number: ${v.reportNumber}`, 14, 53);
      
      doc.setLineWidth(0.5);
      doc.line(14, 58, 196, 58);
      
      doc.setFontSize(14);
      doc.text('Session Details', 14, 68);
      
      doc.setFontSize(11);
      doc.text(`Date Closed: ${new Date(v.closedAt).toLocaleString()}`, 14, 78);
      doc.text(`Cashier: ${v.session?.openedBy || 'N/A'}`, 14, 85);
      doc.text(`Supervisor: ${v.generatedBy || 'N/A'}`, 14, 92);
      doc.text(`Branch: ${v.branch?.name || 'Main'}`, 14, 99);
      
      doc.setLineWidth(0.5);
      doc.line(14, 104, 196, 104);
      
      doc.setFontSize(14);
      doc.text('Financial Summary', 14, 114);
      
      doc.setFontSize(11);
      doc.text(`Total Sales: $${Number(v.totalSales).toFixed(2)}`, 14, 124);
      doc.text(`Expected Cash in Drawer: $${Number(v.expectedCash).toFixed(2)}`, 14, 131);
      doc.text(`Actual Cash Counted: $${Number(v.actualCash).toFixed(2)}`, 14, 138);
      
      const isShortage = Number(v.cashDifference) < 0;
      doc.setFontSize(12);
      doc.setTextColor(isShortage ? 220 : 0, isShortage ? 38 : 128, isShortage ? 38 : 0); // Red for shortage, green for overage
      doc.text(`Variance Amount: $${Number(Math.abs(v.cashDifference)).toFixed(2)} ${isShortage ? '(Shortage)' : '(Overage)'}`, 14, 148);
      
      doc.setTextColor(0, 0, 0); // Reset color
      
      if (v.notes) {
        doc.text(`Notes: ${v.notes}`, 14, 158);
      }
      
      doc.save(`Variance_Report_${v.reportNumber}.pdf`);
      toast('PDF downloaded successfully', 'success');
    } catch (e) {
      console.error(e);
      toast('Failed to generate PDF', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Variance Reports</h2>
          <p className="text-slate-500 mt-1">Track cash drawer shortages and overages</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 bg-slate-50 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5 text-mine-blue-800" />
              Filters
            </CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              <select
                className="px-3 py-2 border rounded-lg text-sm bg-white"
                value={branchId}
                onChange={(e) => { setBranchId(e.target.value); setPage(1); }}
              >
                <option value="">All Branches</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cashier Email..."
                  value={cashier}
                  onChange={(e) => { setCashier(e.target.value); setPage(1); }}
                  className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-48"
                />
              </div>

              <input
                type="date"
                value={date}
                onChange={(e) => { setDate(e.target.value); setPage(1); }}
                className="px-3 py-2 border rounded-lg text-sm bg-white"
              />
              
              {(branchId || cashier || date) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setBranchId(''); setCashier(''); setDate(''); setPage(1); }}
                  className="text-slate-500"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Date</TableHead>
                <TableHead>Z-Report</TableHead>
                <TableHead>Cashier</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead className="text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-400">Loading variances...</TableCell>
                </TableRow>
              ) : variances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-400">No variances found for the selected criteria.</TableCell>
                </TableRow>
              ) : (
                variances.map((v) => {
                  const varianceAmt = Number(v.cashDifference);
                  const isShortage = varianceAmt < 0;
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="pl-6 text-sm">
                        {new Date(v.closedAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{v.reportNumber}</TableCell>
                      <TableCell>{v.session?.openedBy || 'N/A'}</TableCell>
                      <TableCell className="text-sm text-slate-600">{v.branch?.name || 'Main'}</TableCell>
                      <TableCell className="text-right text-sm">${Number(v.expectedCash).toFixed(2)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">${Number(v.actualCash).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={isShortage ? 'destructive' : 'success'}>
                          {isShortage ? '-' : '+'}${Math.abs(varianceAmt).toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="sm" onClick={() => downloadPDF(v)} className="h-8 flex items-center">
                          <Download className="h-4 w-4 mr-2" />
                          PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t">
              <p className="text-sm text-slate-500">
                Showing page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

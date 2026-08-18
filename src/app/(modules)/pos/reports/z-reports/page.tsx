'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Select } from '@/components/ui/select';
import { Search, FileText, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface ZReport {
  id: string;
  reportNumber: string;
  generatedAt: string;
  generatedBy: string;
  totalSales: string;
  actualCash: string;
  cashDifference: string;
  branch?: { name: string } | null;
}

export default function ZReportsPage() {
  const [reports, setReports] = useState<ZReport[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [branchId, setBranchId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [branches, setBranches] = useState<{value: string, label: string}[]>([]);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10; // Number of items per page

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [page, branchId, dateFrom, dateTo]);

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/admin/branches');
      if (res.ok) {
        const data = await res.json();
        const branchArray = Array.isArray(data) ? data : data.items || data.data || [];
        const opts = branchArray.map((b: any) => ({ value: b.id, label: b.name }));
        setBranches([{ value: '', label: 'All Branches' }, ...opts]);
      }
    } catch (e) {
      console.error('Failed to fetch branches', e);
    }
  };

  const fetchReports = async (query = search) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: query,
        page: page.toString(),
        limit: limit.toString(),
        ...(branchId && { branchId }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo })
      });
      const res = await fetch(`/api/pos/reports/z-reports?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.items || []);
        setTotalPages(data.totalPages || 1);
        setTotalItems(data.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    }
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page on search
    fetchReports(search);
  };

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setBranchId(e.target.value);
    setPage(1); // Reset to first page
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Z Reports (End of Day)</h1>
          <p className="text-sm text-slate-500">View and manage POS session closing reports</p>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <FileText className="h-5 w-5 text-mine-blue-600" />
              Generated Reports
            </CardTitle>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="w-full sm:w-48">
                <Select 
                  value={branchId}
                  onChange={handleBranchChange}
                  options={branches}
                  placeholder="Filter by Branch"
                  className="w-full"
                />
              </div>
               <div className="flex space-x-2 items-center">
                 <input
                   type="date"
                   placeholder="From"
                   value={dateFrom}
                   onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                   className="px-2 py-1 border rounded text-sm bg-white border-slate-200 focus:outline-none focus:ring-2 focus:ring-mine-blue-500"
                 />
                 <span className="text-sm text-slate-600">to</span>
                 <input
                   type="date"
                   placeholder="To"
                   value={dateTo}
                   onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                   className="px-2 py-1 border rounded text-sm bg-white border-slate-200 focus:outline-none focus:ring-2 focus:ring-mine-blue-500"
                 />
               </div>
              <form onSubmit={handleSearch} className="flex gap-2 flex-1">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search report # or cashier..."
                    className="pl-9 bg-slate-50 border-slate-200 w-full"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="secondary">Search</Button>
                 {(branchId || dateFrom || dateTo || search) && (
                   <Button 
                     type="button"
                     variant="ghost" 
                     onClick={() => { setBranchId(''); setDateFrom(''); setDateTo(''); setSearch(''); setPage(1); }}
                     className="text-slate-500"
                   >
                     Clear
                   </Button>
                 )}
              </form>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-600">Report Number</TableHead>
                  <TableHead className="font-semibold text-slate-600">Date Generated</TableHead>
                  <TableHead className="font-semibold text-slate-600">Branch</TableHead>
                  <TableHead className="font-semibold text-slate-600">Generated By</TableHead>
                  <TableHead className="font-semibold text-slate-600 text-right">Total Sales</TableHead>
                  <TableHead className="font-semibold text-slate-600 text-right">Actual Cash</TableHead>
                  <TableHead className="font-semibold text-slate-600 text-right">Difference</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-mine-blue-600"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                      No Z reports found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((report) => (
                    <TableRow key={report.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-medium text-slate-900">
                        {report.reportNumber}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {new Date(report.generatedAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {report.branch?.name || <span className="text-slate-400 italic">No Branch</span>}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {report.generatedBy}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-slate-700">
                        ${Number(report.totalSales).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-slate-600">
                        ${Number(report.actualCash).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {Number(report.cashDifference) < 0 ? (
                          <span className="text-red-600 font-semibold">-${Math.abs(Number(report.cashDifference)).toFixed(2)}</span>
                        ) : Number(report.cashDifference) > 0 ? (
                          <span className="text-emerald-600 font-semibold">+${Number(report.cashDifference).toFixed(2)}</span>
                        ) : (
                          <span className="text-slate-400">$0.00</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/pos/reports/z-reports/${report.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 text-mine-blue-600 hover:text-mine-blue-700 hover:bg-mine-blue-50">
                            View <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        {totalPages > 1 && (
          <CardFooter className="flex items-center justify-between border-t border-slate-100 p-4">
            <div className="text-sm text-slate-500">
              Showing <span className="font-medium">{Math.min((page - 1) * limit + 1, totalItems)}</span> to{' '}
              <span className="font-medium">{Math.min(page * limit, totalItems)}</span> of{' '}
              <span className="font-medium">{totalItems}</span> results
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <div className="text-sm font-medium text-slate-600 px-2">
                Page {page} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

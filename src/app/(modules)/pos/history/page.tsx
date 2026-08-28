'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Search, Receipt, Eye, Calendar, AlertTriangle } from 'lucide-react';
import { toast } from '@/lib/use-toast';
import { generateA4Invoice, printPOSReceipt } from '@/lib/pos-print';
import { useReportExport } from '@/hooks/use-report-export';
import { Download, Printer } from 'lucide-react';

interface Transaction {
  id: string;
  transactionNumber: string;
  sessionId: string;
  customerId: string | null;
  customerName: string;
  lines: { productName: string; quantity: number; unitPrice: number; lineTotal: number }[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  amountReceived: number;
  change: number;
  status: string;
  createdAt: string;
  branch?: { id: string; code: string; name: string } | null;
}

const paymentMethodLabels: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  mobile_money: 'Mobile Money',
  credit: 'Credit',
};

const statusFilters = [
  { value: '', label: 'All Status' },
  { value: 'completed', label: 'Completed' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'voided', label: 'Voided' },
];

const paymentMethodFilters = [
  { value: '', label: 'All Methods' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'credit', label: 'Credit' },
];

export default function TransactionHistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;
  
  const [branches, setBranches] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const { triggerExport, ExportDialog } = useReportExport();

  useEffect(() => {
    fetch('/api/admin/branches').then(r => r.json()).then(d => {
      setBranches(Array.isArray(d) ? d : d.data || []);
    });
    fetch('/api/crm/customers').then(r => r.json()).then(d => {
      setCustomers(Array.isArray(d) ? d : d.items || d.data || []);
    });
  }, []);

  const handleVoidTransaction = async (id: string) => {
    if (!confirm('Are you sure you want to void this transaction? This action will reverse stock, financial journals, and loyalty points. It cannot be undone.')) return;
    
    setVoiding(true);
    try {
      const res = await fetch(`/api/pos/transactions/${id}/return`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to void transaction');
      
      toast('Transaction voided successfully', 'success');
      setViewDialogOpen(false);
      fetchTransactions();
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setVoiding(false);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (paymentFilter) params.set('paymentMethod', paymentFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (customerFilter) params.set('customerId', customerFilter);
      if (branchFilter) params.set('branchId', branchFilter);
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      const res = await fetch(`/api/pos/transactions?${params.toString()}`);
      const data = await res.json();
      setTransactions(Array.isArray(data) ? data : data.items || data.data || []);
      if (!Array.isArray(data) && data.total !== undefined) {
        setTotal(data.total);
      }
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [search, statusFilter, paymentFilter, dateFrom, dateTo, customerFilter, branchFilter, page]);

  const handleSearch = () => {
    setPage(1);
    fetchTransactions();
  };

  const viewDetails = (tx: Transaction) => {
    setViewTransaction(tx);
    setViewDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Transaction History</h2>
          <p className="text-slate-500 mt-1">View all point of sale transactions</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5 text-mine-blue-800" />
              Transactions
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by number or customer..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-72"
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleSearch}>
                <Search className="h-4 w-4 mr-1" />
                Search
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <div className="w-40">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <span className="text-slate-400">to</span>
              <div className="w-40">
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
            <div className="w-36">
              <Select
                options={statusFilters}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              />
            </div>
            <div className="w-40">
              <Select
                options={paymentMethodFilters}
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
              />
            </div>
            <div className="w-36">
              <Select
                options={[{value: '', label: 'All Customers'}, ...customers.map(c => ({value: c.id, label: c.name}))]}
                value={customerFilter}
                onChange={(e) => { setCustomerFilter(e.target.value); setPage(1); }}
              />
            </div>
            <div className="w-36">
              <Select
                options={[{value: '', label: 'All Branches'}, ...branches.map(b => ({value: b.id, label: b.name}))]}
                value={branchFilter}
                onChange={(e) => { setBranchFilter(e.target.value); setPage(1); }}
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleSearch} className="h-10">
              Filter
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction #</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Customer Name</TableHead>
                <TableHead>Customer Type</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-slate-400">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-slate-400">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-mono text-xs font-medium">{tx.transactionNumber}</TableCell>
                    <TableCell className="text-sm">{new Date(tx.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{tx.customerName || 'Walk-in'}</TableCell>
                    <TableCell>
                      <Badge variant={tx.customerId ? 'default' : 'secondary'}>
                        {tx.customerId ? 'Loyalty' : 'Walk-in'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{tx.lines?.length ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {paymentMethodLabels[tx.paymentMethod] || tx.paymentMethod}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{tx.branch?.name || '—'}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      ${(tx.total ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          tx.status === 'completed'
                            ? 'success'
                            : tx.status === 'refunded'
                            ? 'warning'
                            : 'secondary'
                        }
                      >
                        {tx.status ? tx.status.charAt(0).toUpperCase() + tx.status.slice(1) : 'Completed'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => viewDetails(tx)}
                          className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-mine-blue-600"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => printPOSReceipt(tx)}
                          className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-mine-blue-600"
                          title="Print Receipt"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => generateA4Invoice(tx, null, triggerExport)}
                          className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-mine-blue-600"
                          title="Download A4 Invoice"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {total > limit && (
            <div className="flex items-center justify-between mt-4 text-sm text-slate-500 border-t pt-4">
              <div>
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} results
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <div className="px-2 font-medium">Page {page} of {Math.ceil(total / limit)}</div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))}
                  disabled={page === Math.ceil(total / limit)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={viewDialogOpen}
        onClose={() => { setViewDialogOpen(false); setViewTransaction(null); }}
        title={`Transaction ${viewTransaction?.transactionNumber || ''}`}
        size="xl"
      >
        {viewTransaction && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-500">Date</p>
                <p className="text-sm font-medium">{new Date(viewTransaction.createdAt).toLocaleString()}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-500">Customer</p>
                <p className="text-sm font-medium">{viewTransaction.customerName || 'Walk-in'}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-500">Payment Method</p>
                <Badge variant="outline">{paymentMethodLabels[viewTransaction.paymentMethod] || viewTransaction.paymentMethod}</Badge>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-500">Status</p>
                <Badge variant={viewTransaction.status === 'completed' ? 'success' : 'secondary'}>
                  {viewTransaction.status ? viewTransaction.status.charAt(0).toUpperCase() + viewTransaction.status.slice(1) : 'Completed'}
                </Badge>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-xs text-slate-500">Branch</p>
              <p className="text-sm font-medium">{viewTransaction.branch?.name || '—'}</p>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b">
                    <th className="text-left p-2 font-medium text-slate-600">Item</th>
                    <th className="text-right p-2 font-medium text-slate-600">Qty</th>
                    <th className="text-right p-2 font-medium text-slate-600">Unit Price</th>
                    <th className="text-right p-2 font-medium text-slate-600">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewTransaction.lines || []).map((item, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="p-2">{item.productName}</td>
                      <td className="text-right p-2 font-mono">{item.quantity}</td>
                      <td className="text-right p-2 font-mono">${Number(item.unitPrice || (item as any).price || 0).toLocaleString()}</td>
                      <td className="text-right p-2 font-mono font-medium">${Number((item as any).total || item.lineTotal || (item.quantity * (item.unitPrice || (item as any).price || 0)) || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>

            <div className="space-y-1 border-t pt-3">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono">${(viewTransaction.subtotal ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>Tax</span>
                <span className="font-mono">${(viewTransaction.tax ?? 0).toLocaleString()}</span>
              </div>
              {(viewTransaction.discount ?? 0) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span className="font-mono">-${(viewTransaction.discount ?? 0).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-slate-900 pt-1.5 border-t">
                <span>Total</span>
                <span className="font-mono">${(viewTransaction.total ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>Amount Received</span>
                <span className="font-mono">${(viewTransaction.amountReceived ?? viewTransaction.total).toLocaleString()}</span>
              </div>
              {(viewTransaction.change ?? 0) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Change</span>
                  <span className="font-mono">${(viewTransaction.change ?? 0).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        )}
        <DialogFooter className="flex justify-between items-center sm:justify-between w-full">
          <div>
            {viewTransaction?.status === 'completed' && (
              <Button
                variant="destructive"
                onClick={() => handleVoidTransaction(viewTransaction.id)}
                disabled={voiding}
                className="flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                {voiding ? 'Voiding...' : 'Void Transaction'}
              </Button>
            )}
          </div>
          <Button variant="outline" onClick={() => { setViewDialogOpen(false); setViewTransaction(null); }}>
            Close
          </Button>
        </DialogFooter>
      </Dialog>
      {ExportDialog}
    </div>
  );
}

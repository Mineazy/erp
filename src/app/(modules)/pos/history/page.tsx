'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Search, Receipt, Eye, Calendar } from 'lucide-react';

interface Transaction {
  id: string;
  transactionNumber: string;
  sessionId: string;
  customerName: string;
  items: { productName: string; quantity: number; unitPrice: number; lineTotal: number }[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  amountReceived: number;
  change: number;
  status: string;
  createdAt: string;
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
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (paymentFilter) params.set('paymentMethod', paymentFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const res = await fetch(`/api/pos/transactions?${params.toString()}`);
      const data = await res.json();
      setTransactions(Array.isArray(data) ? data : data.data || []);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [search, statusFilter, paymentFilter, dateFrom, dateTo]);

  const handleSearch = () => {
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
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
              />
              <span className="text-slate-400">to</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
              />
            </div>
            <Select
              options={statusFilters}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-36"
            />
            <Select
              options={paymentMethodFilters}
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-40"
            />
            <Button variant="outline" size="sm" onClick={handleSearch}>
              Filter
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction #</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-mono text-xs font-medium">{tx.transactionNumber}</TableCell>
                    <TableCell className="text-sm">{new Date(tx.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{tx.customerName || 'Walk-in'}</TableCell>
                    <TableCell className="font-mono text-sm">{tx.items?.length ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {paymentMethodLabels[tx.paymentMethod] || tx.paymentMethod}
                      </Badge>
                    </TableCell>
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
                          className="p-1.5 hover:bg-slate-100 rounded"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4 text-slate-400" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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

            <div className="border rounded-lg overflow-hidden">
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
                  {(viewTransaction.items || []).map((item, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="p-2">{item.productName}</td>
                      <td className="text-right p-2 font-mono">{item.quantity}</td>
                      <td className="text-right p-2 font-mono">${item.unitPrice.toLocaleString()}</td>
                      <td className="text-right p-2 font-mono font-medium">${item.lineTotal.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
        <DialogFooter>
          <Button variant="outline" onClick={() => { setViewDialogOpen(false); setViewTransaction(null); }}>
            Close
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

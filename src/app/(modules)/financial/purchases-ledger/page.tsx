'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Search, Download, Building2, AlertTriangle, DollarSign } from 'lucide-react';

interface Transaction {
  id: string;
  date: string;
  documentNo: string;
  supplierId: string;
  supplierName: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  status: string;
}

interface SupplierSummary {
  supplierId: string;
  supplierName: string;
  totalBilled: number;
  totalOutstanding: number;
  billCount: number;
  isOverdue: boolean;
  email: string | null;
  phone: string | null;
  city: string | null;
  statusBreakdown: { status: string; balance: number }[];
}

interface Totals {
  totalOutstanding: number;
  totalBilled: number;
  overdueCount: number;
  activeSuppliers: number;
  totalSuppliers: number;
}

interface LedgerData {
  transactions: Transaction[];
  summaries: SupplierSummary[];
  totals: Totals;
}

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'default'> = {
  paid: 'success',
  partial: 'warning',
  pending: 'default',
  overdue: 'destructive',
};

export default function PurchasesLedgerPage() {
  const [data, setData] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [supplierId, setSupplierId] = useState('');
  const [suppliers, setSuppliers] = useState<{ value: string; label: string }[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/financial/ap');
      const json = await res.json();
      const unique = new Map<string, string>();
      (json as any[]).forEach((bill: any) => unique.set(bill.supplierId, bill.supplierName));
      setSuppliers(
        Array.from(unique.entries()).map(([id, name]) => ({ value: id, label: name })),
      );
    } catch (e) {
      console.error('Failed to fetch suppliers', e);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (supplierId) params.set('supplierId', supplierId);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/financial/purchases-ledger?${params}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch purchases ledger', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSuppliers(); }, []);
  useEffect(() => { fetchData(); }, [supplierId, dateFrom, dateTo, statusFilter]);

  const groupedTransactions = data?.transactions.reduce(
    (acc, t) => {
      if (!acc[t.supplierId]) acc[t.supplierId] = [];
      acc[t.supplierId].push(t);
      return acc;
    },
    {} as Record<string, Transaction[]>,
  ) || {};

  const t = data?.totals;

  if (loading && !data) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Purchases Ledger</h2>
          <p className="text-slate-500 mt-1">Detailed supplier accounts with running balances</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Outstanding</p>
              <p className="text-xl font-bold text-slate-900">${t?.totalOutstanding.toLocaleString() || '0'}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg"><DollarSign className="h-5 w-5 text-mine-blue-800" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Billed</p>
              <p className="text-xl font-bold text-slate-900">${t?.totalBilled.toLocaleString() || '0'}</p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg"><CreditCard className="h-5 w-5 text-green-600" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Overdue Accounts</p>
              <p className="text-xl font-bold text-red-600">{t?.overdueCount || 0}</p>
            </div>
            <div className="p-2 bg-red-50 rounded-lg"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Active Suppliers</p>
              <p className="text-xl font-bold text-slate-900">{t?.activeSuppliers || 0} / {t?.totalSuppliers || 0}</p>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg"><Building2 className="h-5 w-5 text-purple-600" /></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-mine-blue-800" />
              Supplier Accounts
            </CardTitle>
            <div className="flex items-center gap-3">
              <Select
                options={[{ value: '', label: 'All Suppliers' }, ...suppliers]}
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-48"
              />
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
              <Select
                options={[
                  { value: '', label: 'All Status' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'partial', label: 'Partial' },
                  { value: 'paid', label: 'Paid' },
                  { value: 'overdue', label: 'Overdue' },
                ]}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-32"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-slate-500 py-4">Loading...</p>
          ) : data?.summaries.length === 0 ? (
            <p className="text-slate-400 py-4 text-center">No transactions found</p>
          ) : (
            <div className="space-y-6">
              {data?.summaries.map((summary) => {
                const txns = groupedTransactions[summary.supplierId] || [];
                const isExpanded = expandedSupplier === summary.supplierId;
                return (
                  <div key={summary.supplierId} className="border border-slate-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedSupplier(isExpanded ? null : summary.supplierId)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${summary.isOverdue ? 'bg-red-500' : summary.totalOutstanding > 0 ? 'bg-amber-500' : 'bg-green-500'}`} />
                        <div>
                          <span className="font-semibold text-slate-900">{summary.supplierName}</span>
                          <span className="text-xs text-slate-400 ml-2">
                            {summary.billCount} bill{summary.billCount !== 1 ? 's' : ''}
                            {summary.city ? ` · ${summary.city}` : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-semibold text-slate-900">
                            ${summary.totalOutstanding.toLocaleString()}
                          </div>
                          <div className="text-xs text-slate-400">
                            of ${summary.totalBilled.toLocaleString()}
                          </div>
                        </div>
                        <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </button>
                    {isExpanded && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Document #</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Debit</TableHead>
                            <TableHead className="text-right">Credit</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {txns.map((txn) => (
                            <TableRow key={txn.id}>
                              <TableCell className="text-sm">{new Date(txn.date).toLocaleDateString()}</TableCell>
                              <TableCell className="font-mono text-xs">{txn.documentNo}</TableCell>
                              <TableCell className="text-sm">{txn.description}</TableCell>
                              <TableCell className="text-right font-mono text-green-600">
                                {txn.debit > 0 ? txn.debit.toLocaleString() : '-'}
                              </TableCell>
                              <TableCell className="text-right font-mono text-red-600">
                                {txn.credit > 0 ? txn.credit.toLocaleString() : '-'}
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold">
                                {txn.balance.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Badge variant={statusVariant[txn.status]}>{txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        <tfoot>
                          <TableRow className="font-semibold bg-slate-50 border-t-2 border-slate-200">
                            <TableCell colSpan={3} className="text-sm text-slate-600">Totals</TableCell>
                            <TableCell className="text-right font-mono text-green-700">
                              ${txns.reduce((s, t) => s + t.debit, 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-red-700">
                              ${txns.reduce((s, t) => s + t.credit, 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-slate-900">
                              ${summary.totalOutstanding.toLocaleString()}
                            </TableCell>
                            <TableCell />
                          </TableRow>
                        </tfoot>
                      </Table>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

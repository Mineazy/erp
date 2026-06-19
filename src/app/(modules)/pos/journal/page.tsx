'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Book, Search, Download, DollarSign, Receipt, TrendingUp } from 'lucide-react';

interface JournalLine {
  id: string;
  date: string;
  documentNo: string;
  description: string;
  accountId: string;
  accountName: string;
  accountCode: string;
  debit: number;
  credit: number;
  entryType: 'dr' | 'cr';
  method: string;
  status: string;
  customerName: string | null;
  branchName?: string | null;
}

interface JournalData {
  lines: JournalLine[];
  accounts: { revenueAccount: { id: string; name: string; code: string } | null };
  totals: { totalDebit: number; totalCredit: number; entryCount: number; lineCount: number };
}

const methodLabels: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  mobile_wallet: 'Mobile Wallet',
  credit: 'Credit',
  sales_revenue: 'Sales Revenue',
};

const methodColors: Record<string, string> = {
  cash: 'text-green-600 bg-green-50',
  bank_transfer: 'text-blue-600 bg-blue-50',
  mobile_wallet: 'text-purple-600 bg-purple-50',
  credit: 'text-amber-600 bg-amber-50',
  sales_revenue: 'text-mine-blue-800 bg-mine-blue-50',
};

export default function POSJournalPage() {
  const [data, setData] = useState<JournalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState('transaction');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const res = await fetch(`/api/pos/journal?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json.data || json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredLines = (data?.lines || []).filter((l) =>
    !search ||
    l.documentNo.toLowerCase().includes(search.toLowerCase()) ||
    l.accountName.toLowerCase().includes(search.toLowerCase()) ||
    l.description.toLowerCase().includes(search.toLowerCase()) ||
    (l.customerName && l.customerName.toLowerCase().includes(search.toLowerCase()))
  );

  const groupedArr: { key: string; lines: JournalLine[] }[] = groupBy === 'day'
    ? Object.entries(
        filteredLines.reduce((acc, l) => {
          const day = new Date(l.date).toLocaleDateString();
          if (!acc[day]) acc[day] = [];
          acc[day].push(l);
          return acc;
        }, {} as Record<string, JournalLine[]>)
      ).sort(([a], [b]) => a.localeCompare(b)).map(([key, lines]) => ({ key, lines }))
    : [{ key: 'all', lines: filteredLines }];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Book className="h-6 w-6 text-mine-blue-800" />
          POS Invoice Journal
        </h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-mine-blue-50">
              <Receipt className="h-5 w-5 text-mine-blue-800" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Transactions</p>
              <p className="text-xl font-bold text-slate-900">{data?.totals.entryCount || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Lines</p>
              <p className="text-xl font-bold text-slate-900">{data?.totals.lineCount || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Debit</p>
              <p className="text-xl font-bold text-slate-900">${(data?.totals.totalDebit || 0).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Credit</p>
              <p className="text-xl font-bold text-slate-900">${(data?.totals.totalCredit || 0).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-full"
            />
          </div>
          <Input type="date" label="From" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
          <Input type="date" label="To" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500"
          >
            <option value="transaction">Group by Transaction</option>
            <option value="day">Group by Day</option>
          </select>
          <button
            onClick={() => fetchData()}
            className="px-4 py-2 text-sm font-medium text-white bg-mine-blue-800 rounded-lg hover:bg-mine-blue-700"
          >
            <Download className="h-4 w-4 mr-1.5 inline-block" />
            Refresh
          </button>
        </CardContent>
      </Card>

      {/* Journal Entries */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-mine-blue-800 border-t-transparent rounded-full" />
        </div>
      ) : filteredLines.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-slate-400">
            <Book className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No journal entries found</p>
          </CardContent>
        </Card>
      ) : (
        groupedArr.map(({ key, lines: groupLines }) => {
          const isDayGroup = groupBy === 'day';
          return (
            <Card key={key}>
              {isDayGroup && (
                <CardHeader>
                  <h3 className="text-sm font-semibold text-slate-700">{key}</h3>
                </CardHeader>
              )}
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase">Doc #</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase">Date</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase">Description</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase">Account</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase">Method</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase">Branch</th>
                        <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500 uppercase">Debit</th>
                        <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500 uppercase">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupLines.map((l, idx) => (
                        <tr
                          key={l.id}
                          className={`border-b border-slate-100 hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                        >
                          <td className="px-4 py-2.5 font-mono text-xs font-medium">{l.documentNo}</td>
                          <td className="px-4 py-2.5 text-xs text-slate-600">{new Date(l.date).toLocaleDateString()}</td>
                          <td className="px-4 py-2.5 text-xs text-slate-700 max-w-xs truncate">{l.description}</td>
                          <td className="px-4 py-2.5">
                            <span className="text-xs font-medium">{l.accountName}</span>
                            <span className="text-xs text-slate-400 ml-1">({l.accountCode})</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${methodColors[l.method] || 'text-slate-600 bg-slate-50'}`}>
                              {methodLabels[l.method] || l.method.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-600">{l.branchName || '—'}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs">
                            {l.debit > 0 ? <span className="text-green-600 font-medium">${l.debit.toFixed(2)}</span> : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs">
                            {l.credit > 0 ? <span className="text-mine-blue-800 font-medium">${l.credit.toFixed(2)}</span> : '—'}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-100 font-medium border-t-2 border-slate-300">
                        <td colSpan={6} className="px-4 py-2.5 text-xs text-right text-slate-700">Totals</td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-green-700 font-bold">
                          ${groupLines.reduce((s, l) => s + l.debit, 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-mine-blue-800 font-bold">
                          ${groupLines.reduce((s, l) => s + l.credit, 0).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

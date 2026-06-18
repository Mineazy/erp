'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Download, DollarSign, BookOpen, TrendingUp, ArrowRightLeft } from 'lucide-react';

interface JournalLine {
  id: string;
  date: string;
  documentNo: string;
  description: string;
  supplierName: string;
  accountId: string;
  accountName: string;
  accountCode: string;
  debit: number;
  credit: number;
  entryType: 'dr' | 'cr';
  status: string;
}

interface JournalAccounts {
  debitAccount: { id: string; name: string; code: string } | null;
  creditAccount: { id: string; name: string; code: string } | null;
}

interface JournalTotals {
  totalDebit: number;
  totalCredit: number;
  entryCount: number;
  lineCount: number;
}

interface JournalData {
  lines: JournalLine[];
  accounts: JournalAccounts;
  totals: JournalTotals;
}

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'default'> = {
  paid: 'success',
  partial: 'warning',
  pending: 'default',
  overdue: 'destructive',
};

export default function PurchasesJournalPage() {
  const [data, setData] = useState<JournalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [supplierId, setSupplierId] = useState('');
  const [suppliers, setSuppliers] = useState<{ value: string; label: string }[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [groupBy, setGroupBy] = useState('none');

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/financial/ap');
      const json = await res.json();
      const unique = new Map<string, string>();
      (json as any[]).forEach((bill: any) => unique.set(bill.supplierId, bill.supplierName));
      setSuppliers(Array.from(unique.entries()).map(([id, name]) => ({ value: id, label: name })));
    } catch (e) { console.error('Failed to fetch suppliers', e); }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (supplierId) params.set('supplierId', supplierId);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const res = await fetch(`/api/financial/purchases-journal?${params}`);
      const json = await res.json();
      setData(json);
    } catch (e) { console.error('Failed to fetch purchases journal', e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSuppliers(); }, []);
  useEffect(() => { fetchData(); }, [supplierId, dateFrom, dateTo]);

  const t = data?.totals;

  if (loading && !data) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Purchases Journal</h2>
          <p className="text-slate-500 mt-1">Double-entry journal of all supplier bills</p>
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
              <p className="text-sm text-slate-500">Total Debits</p>
              <p className="text-xl font-bold text-green-600">${t?.totalDebit.toLocaleString() || '0'}</p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg"><TrendingUp className="h-5 w-5 text-green-600" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Credits</p>
              <p className="text-xl font-bold text-red-600">${t?.totalCredit.toLocaleString() || '0'}</p>
            </div>
            <div className="p-2 bg-red-50 rounded-lg"><TrendingUp className="h-5 w-5 text-red-600" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Bill Count</p>
              <p className="text-xl font-bold text-slate-900">{t?.entryCount || 0}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg"><CreditCard className="h-5 w-5 text-mine-blue-800" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Is Balanced</p>
              <p className={`text-xl font-bold ${Math.abs((t?.totalDebit || 0) - (t?.totalCredit || 0)) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs((t?.totalDebit || 0) - (t?.totalCredit || 0)) < 0.01 ? 'Yes' : 'No'}
              </p>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg"><ArrowRightLeft className="h-5 w-5 text-purple-600" /></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-mine-blue-800" />
              Journal Entries
            </CardTitle>
            <div className="flex items-center gap-3">
              <Select
                options={[{ value: '', label: 'All Suppliers' }, ...suppliers]}
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-44"
              />
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-32" />
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-32" />
              <Select
                options={[
                  { value: 'none', label: 'No Grouping' },
                  { value: 'day', label: 'By Day' },
                  { value: 'month', label: 'By Month' },
                ]}
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="w-32"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-slate-500 py-4">Loading...</p>
          ) : data?.accounts.debitAccount && data?.accounts.creditAccount ? (
            <div className="mb-4 p-3 bg-slate-50 rounded-lg flex items-center gap-4 text-sm">
              <BookOpen className="h-4 w-4 text-slate-400" />
              <span className="text-slate-600">
                <strong>Debit:</strong> {data.accounts.debitAccount.name} ({data.accounts.debitAccount.code})
              </span>
              <ArrowRightLeft className="h-4 w-4 text-slate-300" />
              <span className="text-slate-600">
                <strong>Credit:</strong> {data.accounts.creditAccount.name} ({data.accounts.creditAccount.code})
              </span>
            </div>
          ) : null}
          {data && data.lines.length === 0 ? (
            <p className="text-slate-400 py-4 text-center">No journal entries found</p>
          ) : (
            <div className="space-y-6">
              {data && groupBy !== 'none' ? (
                Object.entries(
                  data.lines.reduce((acc, line) => {
                    const key = groupBy === 'day'
                      ? new Date(line.date).toLocaleDateString()
                      : new Date(line.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(line);
                    return acc;
                  }, {} as Record<string, JournalLine[]>)
                ).map(([groupLabel, groupLines]) => {
                  const groupDebit = groupLines.reduce((s, l) => s + l.debit, 0);
                  const groupCredit = groupLines.reduce((s, l) => s + l.credit, 0);
                  return (
                    <div key={groupLabel} className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-700 flex items-center justify-between">
                        <span>{groupLabel}</span>
                        <span className="text-xs font-normal text-slate-400">
                          {groupLines.length / 2} transactions · ${groupDebit.toLocaleString()} Dr / ${groupCredit.toLocaleString()} Cr
                        </span>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Document #</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Account</TableHead>
                            <TableHead className="text-right">Debit</TableHead>
                            <TableHead className="text-right">Credit</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupLines.map((line) => (
                            <TableRow key={line.id} className={line.entryType === 'cr' ? 'bg-slate-50/50' : ''}>
                              <TableCell className="text-sm">{new Date(line.date).toLocaleDateString()}</TableCell>
                              <TableCell className="font-mono text-xs">{line.documentNo}</TableCell>
                              <TableCell className="text-sm">{line.description}</TableCell>
                              <TableCell>
                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${line.entryType === 'dr' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                  {line.accountCode}
                                </span>
                                <span className="text-xs text-slate-500 ml-1">{line.accountName}</span>
                              </TableCell>
                              <TableCell className="text-right font-mono text-green-600">
                                {line.debit > 0 ? line.debit.toLocaleString() : '-'}
                              </TableCell>
                              <TableCell className="text-right font-mono text-red-600">
                                {line.credit > 0 ? line.credit.toLocaleString() : '-'}
                              </TableCell>
                              <TableCell>
                                <Badge variant={statusVariant[line.status]}>{line.status.charAt(0).toUpperCase() + line.status.slice(1)}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        <tfoot>
                          <TableRow className="font-semibold bg-slate-100 border-t-2 border-slate-300">
                            <TableCell colSpan={4} className="text-sm text-slate-700">Group Totals</TableCell>
                            <TableCell className="text-right font-mono text-green-700">${groupDebit.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-mono text-red-700">${groupCredit.toLocaleString()}</TableCell>
                            <TableCell />
                          </TableRow>
                        </tfoot>
                      </Table>
                    </div>
                  );
                })
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Document #</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.lines.map((line) => (
                      <TableRow key={line.id} className={line.entryType === 'cr' ? 'bg-slate-50/50' : ''}>
                        <TableCell className="text-sm">{new Date(line.date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-mono text-xs">{line.documentNo}</TableCell>
                        <TableCell className="text-sm">{line.description}</TableCell>
                        <TableCell>
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${line.entryType === 'dr' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {line.accountCode}
                          </span>
                          <span className="text-xs text-slate-500 ml-1">{line.accountName}</span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-600">
                          {line.debit > 0 ? line.debit.toLocaleString() : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-red-600">
                          {line.credit > 0 ? line.credit.toLocaleString() : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant[line.status]}>{line.status.charAt(0).toUpperCase() + line.status.slice(1)}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <tfoot>
                    <TableRow className="font-bold bg-slate-50 border-t-2 border-slate-300">
                      <TableCell colSpan={4} className="text-sm text-slate-700">Totals ({data?.totals.entryCount} bills)</TableCell>
                      <TableCell className="text-right font-mono text-green-700">${t?.totalDebit.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-red-700">${t?.totalCredit.toLocaleString()}</TableCell>
                      <TableCell />
                    </TableRow>
                  </tfoot>
                </Table>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Scale, Download, Printer } from 'lucide-react';

interface TrialBalanceRow {
  code: string;
  account: string;
  type: string;
  debit: number;
  credit: number;
}

export default function TrialBalancePage() {
  const [data, setData] = useState<TrialBalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (period) params.set('period', period);
      const res = await fetch(`/api/financial/trial-balance?${params}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch trial balance', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [period]);

  const totalDebit = data.reduce((s, r) => s + r.debit, 0);
  const totalCredit = data.reduce((s, r) => s + r.credit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Trial Balance</h2>
          <p className="text-slate-500 mt-1">Verify debits equal credits for a given period</p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-40"
          />
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-mine-blue-800" />
              <div>
                <CardTitle className="text-lg">Trial Balance</CardTitle>
                <CardDescription>Period: {period || 'All periods'}</CardDescription>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${isBalanced ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {isBalanced ? 'Balanced' : 'Not Balanced'}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Code</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.code}>
                  <TableCell className="font-mono text-xs text-slate-500">{row.code}</TableCell>
                  <TableCell className="font-medium">{row.account}</TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      row.type === 'asset' || row.type === 'expense' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                    }`}>
                      {row.type.charAt(0).toUpperCase() + row.type.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {row.debit > 0 ? row.debit.toLocaleString() : '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {row.credit > 0 ? row.credit.toLocaleString() : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <tfoot>
              <TableRow className="font-bold border-t-2 border-slate-300">
                <TableCell colSpan={3} className="text-right text-slate-900">Totals</TableCell>
                <TableCell className="text-right font-mono text-slate-900">{totalDebit.toLocaleString()}</TableCell>
                <TableCell className="text-right font-mono text-slate-900">{totalCredit.toLocaleString()}</TableCell>
              </TableRow>
            </tfoot>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

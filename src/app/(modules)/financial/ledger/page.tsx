'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Book, Search, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LedgerEntry {
  id: string;
  date: string;
  entryNumber: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export default function LedgerPage() {
  const [data, setData] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [accounts, setAccounts] = useState<{ value: string; label: string }[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/financial/coa');
      const json = await res.json();
      const flat = (items: any[]): { value: string; label: string }[] =>
        items.flatMap((a: any) => [
          { value: a.code, label: `${a.code} - ${a.name}` },
          ...(a.children ? flat(a.children) : []),
        ]);
      const opts = flat(json);
      setAccounts(opts);
      if (opts.length > 0 && !selectedAccount) setSelectedAccount(opts[0].value);
    } catch (e) {
      console.error('Failed to fetch accounts', e);
    }
  };

  const fetchData = async () => {
    if (!selectedAccount) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({ accountId: selectedAccount });
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const res = await fetch(`/api/financial/ledger?${params}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch ledger', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAccounts(); }, []);

  useEffect(() => { fetchData(); }, [selectedAccount, dateFrom, dateTo]);

  const selectedLabel = accounts.find((a) => a.value === selectedAccount)?.label || '';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">General Ledger</h2>
        <p className="text-slate-500 mt-1">View account activity and running balances</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Book className="h-5 w-5 text-mine-blue-800" />
              Account Ledger
            </CardTitle>
            <div className="flex items-center gap-3">
              <Select
                options={accounts}
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-72"
              />
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
          <CardDescription className="mt-2 font-medium text-slate-800">{selectedLabel}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-slate-500 py-4">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Entry #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right font-bold">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((entry, idx) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.date}</TableCell>
                    <TableCell className="font-mono text-xs">{entry.entryNumber}</TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell className="text-right font-mono text-green-600">
                      {entry.debit > 0 ? entry.debit.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-red-600">
                      {entry.credit > 0 ? entry.credit.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {entry.balance.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-400 py-4">No entries found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

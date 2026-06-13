'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { JournalForm } from '@/components/financial/journal-form';
import { FileText, Plus, CheckCircle, XCircle, Search, Filter, Eye } from 'lucide-react';

interface JournalEntry {
  id: string;
  entryNumber: string;
  description: string;
  entryDate: string;
  period: string;
  status: 'draft' | 'posted' | 'void';
  totalDebit: number;
  totalCredit: number;
  createdAt: string;
  lines?: any[];
}

interface AccountOption {
  value: string;
  label: string;
}

const statusVariant: Record<string, 'default' | 'success' | 'destructive' | 'warning'> = {
  draft: 'default',
  posted: 'success',
  void: 'destructive',
};

export default function JournalPage() {
  const [data, setData] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [viewEntry, setViewEntry] = useState<JournalEntry | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/financial/journal?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch journal entries', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/financial/coa');
      if (!res.ok) throw new Error('Failed to fetch accounts');
      const items = await res.json();
      const flat = (list: any[]): AccountOption[] =>
        list.flatMap((a: any) => [
          { value: a.id, label: `${a.code} - ${a.name}` },
          ...(a.children ? flat(a.children) : []),
        ]);
      setAccounts(flat(Array.isArray(items) ? items : []));
    } catch (e) {
      console.error('Failed to fetch accounts', e);
    }
  };

  useEffect(() => { fetchData(); fetchAccounts(); }, [search]);

  const handleSubmit = async (formData: { entryDate: string; description: string; lines: any[] }) => {
    try {
      const res = await fetch('/api/financial/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Create failed' }));
        alert(err.error || 'Failed to create journal entry');
        return;
      }
      setShowForm(false);
      fetchData();
    } catch (e) {
      alert('Network error. Please try again.');
    }
  };

  const handlePost = async (id: string) => {
    try {
      const res = await fetch(`/api/financial/journal/${id}/post`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Post failed' }));
        alert(err.error || 'Failed to post entry');
        return;
      }
      fetchData();
    } catch (e) {
      alert('Network error. Please try again.');
    }
  };

  const handleVoid = async (id: string) => {
    if (!confirm('Void this journal entry?')) return;
    try {
      const res = await fetch(`/api/financial/journal/${id}/void`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Void failed' }));
        alert(err.error || 'Failed to void entry');
        return;
      }
      fetchData();
    } catch (e) {
      alert('Network error. Please try again.');
    }
  };

  const openView = async (id: string) => {
    try {
      const res = await fetch(`/api/financial/journal/${id}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const entry = await res.json();
      setViewEntry(entry);
      setViewOpen(true);
    } catch (e) {
      console.error('Failed to fetch entry details', e);
    }
  };

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Journal Entries</h2>
            <p className="text-slate-500 mt-1">Create a new journal entry</p>
          </div>
          <Button variant="outline" onClick={() => setShowForm(false)}>Back to List</Button>
        </div>
        <JournalForm
          accounts={accounts}
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
        />
      </div>
    );
  }

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Journal Entries</h2>
          <p className="text-slate-500 mt-1">Record and manage journal entries</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Journal Entry
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-mine-blue-800" />
              All Entries
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search entries..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entry #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Total Debit</TableHead>
                <TableHead className="text-right">Total Credit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono text-sm font-medium">{entry.entryNumber}</TableCell>
                  <TableCell>{entry.entryDate}</TableCell>
                  <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                  <TableCell>{entry.period}</TableCell>
                  <TableCell className="text-right font-mono">{entry.totalDebit.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono">{entry.totalCredit.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[entry.status] || 'default'}>
                      {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openView(entry.id)} className="p-1.5 hover:bg-slate-100 rounded transition-colors" title="View">
                        <Eye className="h-4 w-4 text-slate-400" />
                      </button>
                      {entry.status === 'draft' && (
                        <button onClick={() => handlePost(entry.id)} className="p-1.5 hover:bg-green-50 rounded transition-colors" title="Post">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </button>
                      )}
                      {entry.status === 'draft' && (
                        <button onClick={() => handleVoid(entry.id)} className="p-1.5 hover:bg-red-50 rounded transition-colors" title="Void">
                          <XCircle className="h-4 w-4 text-red-500" />
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={viewOpen}
        onClose={() => { setViewOpen(false); setViewEntry(null); }}
        title={`Journal Entry ${viewEntry?.entryNumber || ''}`}
        size="lg"
      >
        {viewEntry && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-500">Entry Number</p>
                <p className="font-mono text-sm font-medium">{viewEntry.entryNumber}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-500">Status</p>
                <Badge variant={statusVariant[viewEntry.status]}>
                  {viewEntry.status.charAt(0).toUpperCase() + viewEntry.status.slice(1)}
                </Badge>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-500">Date</p>
                <p className="text-sm">{viewEntry.entryDate}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-500">Period</p>
                <p className="text-sm">{viewEntry.period}</p>
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-xs text-slate-500">Description</p>
              <p className="text-sm">{viewEntry.description}</p>
            </div>
            {viewEntry.lines && viewEntry.lines.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="text-left p-2 font-medium text-slate-600">Account</th>
                      <th className="text-left p-2 font-medium text-slate-600">Description</th>
                      <th className="text-right p-2 font-medium text-slate-600">Debit</th>
                      <th className="text-right p-2 font-medium text-slate-600">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewEntry.lines.map((line: any, idx: number) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="p-2 font-mono text-xs">{line.account?.code} - {line.account?.name}</td>
                        <td className="p-2 text-xs">{line.description || '-'}</td>
                        <td className="text-right p-2 font-mono text-green-600">
                          {line.debit > 0 ? line.debit.toLocaleString() : '-'}
                        </td>
                        <td className="text-right p-2 font-mono text-red-600">
                          {line.credit > 0 ? line.credit.toLocaleString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold pt-2 border-t">
              <span>Total</span>
              <span className="font-mono">
                Debit: ${viewEntry.totalDebit.toLocaleString()} | Credit: ${viewEntry.totalCredit.toLocaleString()}
              </span>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => { setViewOpen(false); setViewEntry(null); }}>Close</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

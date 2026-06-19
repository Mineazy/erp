'use client';

import { toast, dismissToast } from '@/components/ui/toast';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, Plus, Eye, LogIn, Clock, DollarSign } from 'lucide-react';

interface Session {
  id: string;
  openedAt: string;
  closedAt: string | null;
  openedBy: string;
  status: 'open' | 'closed';
  totalSales: number;
  transactionCount: number;
  branch?: { id: string; code: string; name: string } | null;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewSession, setViewSession] = useState<Session | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pos/sessions');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : data.data || []);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const openNewSession = async () => {
    try {
      const tid = toast('Saving session...', 'info', 120000);
      let res;
      try {
        res = await fetch('/api/pos/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ openingBalance: 0 }),
        });
      } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to create session' }));
        dismissToast(tid);
        toast(err.error || 'Failed to create session', 'error');
        return;
      }
      const data = await res.json();
      dismissToast(tid);
      toast('Session created successfully', 'success');
      setSessions((prev) => [data.data || data, ...prev]);
    } catch {
      toast('Network error. Please try again.', 'error');
    }
  };

  const viewDetails = (session: Session) => {
    setViewSession(session);
    setViewDialogOpen(true);
  };

  const filtered = sessions.filter(
    (s) =>
      !search ||
      s.openedBy?.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">POS Sessions</h2>
          <p className="text-slate-500 mt-1">Manage point of sale sessions</p>
        </div>
        <Button onClick={openNewSession} variant="secondary">
          <Plus className="h-4 w-4 mr-2" />
          New Session
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-mine-blue-800" />
              Sessions
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search sessions..."
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
                <TableHead>Session ID</TableHead>
                <TableHead>Opened</TableHead>
                <TableHead>Closed</TableHead>
                <TableHead>Opened By</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Transactions</TableHead>
                <TableHead className="text-right">Total Sales</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-400">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-400">
                    No sessions found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-mono text-xs font-medium">{session.id.slice(0, 8)}...</TableCell>
                    <TableCell className="text-sm">{new Date(session.openedAt).toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {session.closedAt ? new Date(session.closedAt).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell>{session.openedBy || '-'}</TableCell>
                    <TableCell className="text-xs text-slate-600">{session.branch?.name || '—'}</TableCell>
                    <TableCell className="font-mono text-sm">{session.transactionCount ?? 0}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      ${(session.totalSales ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={session.status === 'open' ? 'success' : 'secondary'}>
                        {session.status === 'open' ? 'Open' : 'Closed'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => viewDetails(session)}
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
        onClose={() => { setViewDialogOpen(false); setViewSession(null); }}
        title="Session Details"
        size="lg"
      >
        {viewSession && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-500">Session ID</p>
                <p className="font-mono text-sm font-medium">{viewSession.id}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-500">Status</p>
                <Badge variant={viewSession.status === 'open' ? 'success' : 'secondary'}>
                  {viewSession.status === 'open' ? 'Open' : 'Closed'}
                </Badge>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-500">Opened</p>
                <p className="text-sm">{new Date(viewSession.openedAt).toLocaleString()}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-500">Closed</p>
                <p className="text-sm">{viewSession.closedAt ? new Date(viewSession.closedAt).toLocaleString() : '-'}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-500">Transactions</p>
                <p className="text-lg font-bold">{viewSession.transactionCount ?? 0}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-500">Total Sales</p>
                <p className="text-lg font-bold text-mine-blue-800">${(viewSession.totalSales ?? 0).toLocaleString()}</p>
              </div>
            </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-500">Opened By</p>
                <p className="text-sm">{viewSession.openedBy || 'Unknown'}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-500">Branch</p>
                <p className="text-sm">{viewSession.branch?.name || '—'}</p>
              </div>
            </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => { setViewDialogOpen(false); setViewSession(null); }}>
            Close
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

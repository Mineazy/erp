'use client';

import { toast, dismissToast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, AlertTriangle, AlertCircle, CheckCircle, Package, RefreshCw } from 'lucide-react';

const ALERT_TYPES = [
  { value: 'low_stock', label: 'Low Stock' },
  { value: 'out_of_stock', label: 'Out of Stock' },
  { value: 'overstock', label: 'Overstock' },
  { value: 'predicted_stockout', label: 'Predicted Stockout' },
  { value: 'transfer', label: 'Transfer Alert' },
  { value: 'count_reminder', label: 'Count Reminder' },
];

const ALERT_SEVERITIES = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' },
];

const TYPE_CFG: Record<string, { icon: any; c: string; bg: string }> = {
  low_stock: { icon: AlertTriangle, c: 'text-amber-600', bg: 'bg-amber-50' },
  out_of_stock: { icon: AlertCircle, c: 'text-red-600', bg: 'bg-red-50' },
  overstock: { icon: Package, c: 'text-blue-600', bg: 'bg-blue-50' },
  predicted_stockout: { icon: AlertTriangle, c: 'text-orange-600', bg: 'bg-orange-50' },
  transfer: { icon: RefreshCw, c: 'text-purple-600', bg: 'bg-purple-50' },
  count_reminder: { icon: CheckCircle, c: 'text-teal-600', bg: 'bg-teal-50' },
};

const SEV_CFG: Record<string, { v: string; dot: string }> = {
  critical: { v: 'destructive', dot: 'bg-red-500' },
  warning: { v: 'warning', dot: 'bg-amber-500' },
  info: { v: 'info', dot: 'bg-blue-500' },
};

export default function AlertsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [gen, setGen] = useState(false);
  const [fType, setFType] = useState('');
  const [fSev, setFSev] = useState('');
  const [fRead, setFRead] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const p = new URLSearchParams();
      if (fType) p.set('type', fType);
      if (fSev) p.set('severity', fSev);
      if (fRead) p.set('isRead', fRead === 'unread' ? 'false' : 'true');
      const res = await fetch(`/api/inventory/alerts?${p}`);
      if (!res.ok) throw new Error('Failed');
      const j = await res.json();
      setData(j.items ?? j);
    } catch { console.error } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [fType, fSev, fRead]);

  const total = data.length;
  const unread = data.filter((a: any) => !a.isRead);
  const critical = data.filter((a: any) => a.severity === 'critical');
  const typeCounts = ALERT_TYPES.reduce((acc: any[], t) => {
    const c = data.filter((a: any) => a.type === t.value).length;
    if (c > 0) acc.push({ ...t, count: c });
    return acc;
  }, []);

  const fetchWrap = async (msg: string, url: string, opts: RequestInit) => {
    const tid = toast(msg, 'info', 120000);
    try {
      const res = await fetch(url, opts);
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: 'Failed' }));
        dismissToast(tid);
        return toast(e.error || 'Failed', 'error');
      }
      dismissToast(tid);
      return 'ok';
    } catch { dismissToast(tid); toast('Network error', 'error'); return; }
  };

  const handleGen = async () => {
    setGen(true);
    const r = await fetchWrap('Generating alerts...', '/api/inventory/alerts', { method: 'POST' });
    if (r) { toast('Alerts generated', 'success'); fetchData(); }
    setGen(false);
  };

  const handleRead = (id: string) => fetchWrap('Marking as read...', `/api/inventory/alerts/${id}`, { method: 'PUT' }).then((r) => { if (r) { toast('Marked as read', 'success'); fetchData(); } });

  const handleReadAll = async () => {
    const list = data.filter((a: any) => !a.isRead);
    if (!list.length) return toast('No unread alerts', 'info');
    const tid = toast(`Marking ${list.length} alerts...`, 'info', 120000);
    let ok = true;
    for (const a of list) {
      try { const r = await fetch(`/api/inventory/alerts/${a.id}`, { method: 'PUT' }); if (!r.ok) { ok = false; break; } } catch { ok = false; break; }
    }
    dismissToast(tid);
    if (ok) { toast(`${list.length} marked as read`, 'success'); fetchData(); }
    else toast('Failed to mark some as read', 'error');
  };

  const handleDel = async (id: string) => {
    const ok = await confirmDialog({ title: 'Delete Alert', message: 'Are you sure?', variant: 'danger' }); if (!ok) return;
    const r = await fetchWrap('Deleting...', `/api/inventory/alerts/${id}`, { method: 'DELETE' });
    if (r) { toast('Deleted', 'success'); fetchData(); }
  };

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Alerts</h2>
          <p className="text-slate-500 mt-1">Monitor inventory alerts and notifications</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleGen} loading={gen}>
            <Bell className="h-4 w-4 mr-2" />
            Generate Alerts
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Alerts</p>
              <p className="text-xl font-bold text-slate-900">{total}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg"><Bell className="h-5 w-5 text-blue-600" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Unread</p>
              <p className="text-xl font-bold text-amber-600">{unread.length}</p>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg"><BellOff className="h-5 w-5 text-amber-600" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Critical</p>
              <p className="text-xl font-bold text-red-600">{critical.length}</p>
            </div>
            <div className="p-2 bg-red-50 rounded-lg"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500 mb-2">By Type</p>
            <div className="space-y-1">
              {typeCounts.length > 0 ? typeCounts.slice(0, 4).map((t) => (
                <div key={t.value} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">{t.label}</span>
                  <span className="font-semibold text-slate-900">{t.count}</span>
                </div>
              )) : <span className="text-xs text-slate-400">No alerts</span>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-600" />
              Alert List
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select options={[{ value: '', label: 'All Types' }, ...ALERT_TYPES]} placeholder="Filter type" value={fType} onChange={(e) => setFType(e.target.value)} className="w-36" />
              <Select options={[{ value: '', label: 'All Severities' }, ...ALERT_SEVERITIES]} placeholder="Filter severity" value={fSev} onChange={(e) => setFSev(e.target.value)} className="w-36" />
              <Select options={[{ value: '', label: 'All Status' }, { value: 'unread', label: 'Unread' }, { value: 'read', label: 'Read' }]} placeholder="Filter status" value={fRead} onChange={(e) => setFRead(e.target.value)} className="w-32" />
              {unread.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleReadAll}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark All Read
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No alerts found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((a: any) => {
                  const tc = TYPE_CFG[a.type] || TYPE_CFG.low_stock;
                  const sc = SEV_CFG[a.severity] || SEV_CFG.info;
                  const Ti = tc.icon;
                  return (
                    <TableRow key={a.id} className={!a.isRead ? 'font-semibold' : ''}>
                      <TableCell>
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${tc.bg} ${tc.c}`}>
                          <Ti className="h-3.5 w-3.5" />
                          {ALERT_TYPES.find((t: any) => t.value === a.type)?.label || a.type}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{a.title}</TableCell>
                      <TableCell className="max-w-[300px] truncate text-slate-600">{a.message}</TableCell>
                      <TableCell>
                        <Badge variant={sc.v as any}>
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${sc.dot} mr-1.5`} />
                          {ALERT_SEVERITIES.find((s: any) => s.value === a.severity)?.label || a.severity}
                        </Badge>
                      </TableCell>
                      <TableCell><Badge variant={a.isRead ? 'secondary' : 'default'}>{a.isRead ? 'Read' : 'Unread'}</Badge></TableCell>
                      <TableCell className="text-xs text-slate-500">{new Date(a.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!a.isRead && (
                            <button onClick={() => handleRead(a.id)} className="p-1.5 hover:bg-blue-50 rounded" title="Mark as read">
                              <CheckCircle className="h-4 w-4 text-blue-500" />
                            </button>
                          )}
                          <button onClick={() => handleDel(a.id)} className="p-1.5 hover:bg-red-50 rounded" title="Delete">
                            <AlertCircle className="h-4 w-4 text-red-400" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

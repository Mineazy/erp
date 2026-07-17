'use client';

import { toast } from '@/components/ui/toast';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollText, Search, Filter } from 'lucide-react';

const actionBadge: Record<string, string> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'destructive',
  APPROVE: 'warning',
};

const entityTypes = [
  { value: '', label: 'All Entity Types' },
  { value: 'product', label: 'Product' },
  { value: 'category', label: 'Category' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'sales_order', label: 'Sales Order' },
  { value: 'goods_receipt', label: 'Goods Receipt' },
  { value: 'dispatch_note', label: 'Dispatch Note' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'count', label: 'Count' },
  { value: 'return', label: 'Return' },
  { value: 'quotation', label: 'Quotation' },
];

const actions = [
  { value: '', label: 'All Actions' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'APPROVE', label: 'Approve' },
];

export default function AuditTrailPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [userId, setUserId] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAudit = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (entityType) params.set('entityType', entityType);
      if (action) params.set('action', action);
      if (userId) params.set('userId', userId);
      const res = await fetch(`/api/inventory/audit?${params}`);
      if (!res.ok) throw new Error('Failed to fetch audit');
      const json = await res.json();
      setRecords(json.items ?? json.data ?? json.records ?? []);
      setTotalPages(json.totalPages ?? json.pages ?? 1);
    } catch {
      toast('Failed to load audit trail', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, entityType, action, userId]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchAudit, 30000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchAudit]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Audit Trail</h2>
          <p className="text-slate-500 mt-1">Track all inventory changes and user activity</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-mine-blue-800" />
              Activity Log
            </CardTitle>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Auto-refresh (30s)
              </label>
              <div className="flex items-center gap-2">
                <div className="w-36">
                  <Select options={entityTypes} value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }} />
                </div>
                <div className="w-32">
                  <Select options={actions} value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} />
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="User ID..."
                    value={userId}
                    onChange={(e) => { setUserId(e.target.value); setPage(1); }}
                    className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-40"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && <div className="text-center py-8 text-slate-500">Loading...</div>}
          {!loading && records.length === 0 && (
            <div className="text-center py-8 text-slate-500">No audit records found</div>
          )}
          {!loading && records.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Entity ID</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Changes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((rec: any) => (
                  <>
                    <TableRow
                      key={rec.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => setExpandedRow(expandedRow === rec.id ? null : rec.id)}
                    >
                      <TableCell className="text-xs font-mono whitespace-nowrap">
                        {rec.timestamp ? new Date(rec.timestamp).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell className="text-sm">{rec.user?.name ?? rec.userId ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={(actionBadge[rec.action] as any) || 'default'}>
                          {rec.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{rec.entityType}</TableCell>
                      <TableCell className="text-xs font-mono">{rec.entityId}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{rec.description || '—'}</TableCell>
                      <TableCell className="max-w-[200px]">
                        {rec.changes ? (
                          <span className="text-xs text-mine-blue-800 font-mono truncate block">
                            {JSON.stringify(rec.changes).slice(0, 60)}
                            {JSON.stringify(rec.changes).length > 60 ? '...' : ''}
                          </span>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                    {expandedRow === rec.id && rec.changes && (
                      <TableRow key={`${rec.id}-expanded`}>
                        <TableCell colSpan={7} className="bg-slate-50 p-4">
                          <pre className="text-xs font-mono whitespace-pre-wrap bg-white p-3 rounded border border-slate-200 max-h-48 overflow-auto">
                            {JSON.stringify(rec.changes, null, 2)}
                          </pre>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
          {!loading && records.length > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
              <span className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Previous
                </Button>
                <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

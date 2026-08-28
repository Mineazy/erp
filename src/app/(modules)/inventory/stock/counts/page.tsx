'use client';

import { toast, dismissToast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { ClipboardCheck, Plus, Search, Trash2, CheckCircle, Package, AlertTriangle } from 'lucide-react';
import { COUNT_STATUS } from '@/lib/constants';
import { useNetwork } from '@/lib/hooks/use-network';
import { cacheData, getCachedData, saveOfflineTransaction } from '@/lib/db';

interface CL { id: string; product: { id: string; code: string; name: string }; systemQty: number; countedQty: number; variance: number }
interface CS { id: string; countNo: string; status: string; lines: CL[]; countedBy?: { name: string } | null; approvedBy?: { name: string } | null; createdAt: string }
interface LI { productId: string; productCode: string; productName: string; systemQty: number; countedQty: number }

const sv: Record<string, 'secondary' | 'warning' | 'default' | 'success'> = { draft: 'secondary', in_progress: 'warning', completed: 'default', approved: 'success' };

async function api(url: string, opts?: RequestInit) { const r = await fetch(url, opts); if (!r.ok) throw new Error((await r.json().catch(() => ({ error: 'Request failed' }))).error || 'Request failed'); return r.json(); }

export default function StockCountsPage() {
  const { isOnline } = useNetwork();
  const [data, setData] = useState<CS[]>([]);
  const [prods, setProds] = useState<LI[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sf, setSf] = useState('');
  const [cd, setCd] = useState(false);
  const [vd, setVd] = useState(false);
  const [sc, setSc] = useState<CS | null>(null);
  const [li, setLi] = useState<LI[]>([]);

  const fetchData = async () => {
    try {
      if (!isOnline) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const p = new URLSearchParams();
      if (search) p.set('search', search);
      if (sf) p.set('status', sf);
      const json = await api(`/api/inventory/stock/counts?${p}`);
      setData(json.items ?? json);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchProds = async () => {
    try {
      if (!isOnline) {
        const cached = await getCachedData('products_cache');
        if (cached.length > 0) {
          setProds(cached.map((p: any) => ({ productId: p.id, productCode: p.code, productName: p.name, systemQty: p.stock, countedQty: p.stock })));
        }
        return;
      }
      
      const json = await api('/api/inventory/products?limit=500');
      const items = json.items ?? json;
      setProds(items.map((p: any) => ({ productId: p.id, productCode: p.code, productName: p.name, systemQty: p.stock, countedQty: p.stock })));
      
      if (isOnline) {
        await cacheData('products_cache', items);
      }
    } catch (_) {}
  };

  useEffect(() => { fetchData(); }, [search, sf]);
  useEffect(() => { fetchProds(); }, []);

  const vc = (lines: CL[]) => lines.filter((l) => l.variance !== 0).length;

  const openCreate = () => { setLi([...prods]); setCd(true); };

  const openView = (c: CS) => { setSc(c); setVd(true); };

  const handleSave = async () => {
    const payload = { lines: li.map((l) => ({ productId: l.productId, systemQty: l.systemQty, countedQty: l.countedQty })) };
    
    if (!isOnline) {
      try {
        await saveOfflineTransaction({
          id: crypto.randomUUID(),
          type: 'inventory_count',
          payload,
          timestamp: Date.now(),
          status: 'pending'
        });
        toast('Offline stock count saved locally', 'success');
        setCd(false);
      } catch {
        toast('Failed to save offline count', 'error');
      }
      return;
    }

    try {
      const tid = toast('Creating count...', 'info', 120000);
      let res;
      try {
        res = await fetch('/api/inventory/stock/counts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) { const err = await res.json().catch(() => ({ error: 'Save failed' })); dismissToast(tid); toast(err.error || 'Failed to create count', 'error'); return; }
      dismissToast(tid);
      toast('Stock count created', 'success');
      setCd(false);
      fetchData();
    } catch { toast('Network error. Please try again.', 'error'); }
  };

  const handleApprove = async () => {
    if (!sc) return;
    const ok = await confirmDialog({ title: 'Approve Count', message: 'This will create stock adjustments for all variances. Continue?', variant: 'warning' });
    if (!ok) return;
    try {
      const tid = toast('Approving count...', 'info', 120000);
      let res;
      try { res = await fetch(`/api/inventory/stock/counts/${sc.id}/approve`, { method: 'POST' }); } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) { const err = await res.json().catch(() => ({ error: 'Approve failed' })); dismissToast(tid); toast(err.error || 'Failed to approve', 'error'); return; }
      dismissToast(tid);
      toast('Count approved, adjustments created', 'success');
      setVd(false); setSc(null);
      fetchData();
    } catch { toast('Network error', 'error'); }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({ title: 'Delete Count', message: 'Are you sure?', variant: 'danger' });
    if (!ok) return;
    try {
      const tid = toast('Deleting...', 'info', 120000);
      let res;
      try { res = await fetch(`/api/inventory/stock/counts/${id}`, { method: 'DELETE' }); } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) { const err = await res.json().catch(() => ({ error: 'Delete failed' })); dismissToast(tid); toast(err.error, 'error'); return; }
      dismissToast(tid);
      toast('Count deleted', 'success');
      fetchData();
    } catch { toast('Network error', 'error'); }
  };

  const pending = data.filter((c) => c.status === 'draft' || c.status === 'in_progress');
  const completed = data.filter((c) => c.status === 'completed');
  const approved = data.filter((c) => c.status === 'approved');

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Stock Counts</h2>
          <p className="text-slate-500 mt-1">Track and manage physical inventory counts</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Start New Count</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Counts', value: data.length, icon: ClipboardCheck, bg: 'bg-blue-50', color: 'text-blue-800' },
          { label: 'Pending', value: pending.length, icon: AlertTriangle, bg: 'bg-amber-50', color: 'text-amber-600' },
          { label: 'Completed', value: completed.length, icon: CheckCircle, bg: 'bg-blue-50', color: 'text-blue-600' },
          { label: 'Approved', value: approved.length, icon: Package, bg: 'bg-green-50', color: 'text-green-600' },
        ].map(({ label, value, icon: Icon, bg, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="text-xl font-bold text-slate-900">{value}</p>
              </div>
              <div className={`p-2 ${bg} rounded-lg`}><Icon className={`h-5 w-5 ${color}`} /></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-blue-800" />Count Sessions</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-56" />
              </div>
              <Select options={[{ value: '', label: 'All Statuses' }, ...COUNT_STATUS.map((s) => ({ value: s.value, label: s.label }))]} value={sf} onChange={(e) => setSf(e.target.value)} className="w-36" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="text-center py-8 text-slate-400">No counts found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Count No</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead className="text-center">Variances</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Counted By</TableHead>
                  <TableHead>Approved By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs font-medium cursor-pointer hover:text-blue-700" onClick={() => openView(c)}>{c.countNo}</TableCell>
                    <TableCell className="text-center font-mono text-sm">{c.lines.length}</TableCell>
                    <TableCell className="text-center"><span className={`font-mono text-sm ${vc(c.lines) > 0 ? 'text-red-600 font-semibold' : 'text-slate-600'}`}>{vc(c.lines)}</span></TableCell>
                    <TableCell><Badge variant={sv[c.status] || 'secondary'}>{COUNT_STATUS.find((s) => s.value === c.status)?.label || c.status}</Badge></TableCell>
                    <TableCell className="text-sm text-slate-600">{c.countedBy?.name || '—'}</TableCell>
                    <TableCell className="text-sm text-slate-600">{c.approvedBy?.name || '—'}</TableCell>
                    <TableCell className="text-sm text-slate-600">{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openView(c)} className="p-1.5 hover:bg-slate-100 rounded"><ClipboardCheck className="h-4 w-4 text-slate-400" /></button>
                        {c.status === 'completed' && <button onClick={() => { setSc(c); handleApprove(); }} className="p-1.5 hover:bg-green-50 rounded"><CheckCircle className="h-4 w-4 text-green-500" /></button>}
                        {(c.status === 'draft' || c.status === 'in_progress') && <button onClick={() => handleDelete(c.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-red-400" /></button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={cd} onClose={() => setCd(false)} title="Start New Count" size="xl">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Enter counted quantities for each product.</p>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">System Qty</TableHead>
                  <TableHead className="text-right">Counted Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {li.map((l, i) => (
                  <TableRow key={l.productId}>
                    <TableCell className="font-mono text-xs">{l.productCode}</TableCell>
                    <TableCell className="text-sm">{l.productName}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{l.systemQty}</TableCell>
                    <TableCell className="text-right">
                      <input type="number" step="0.01" value={l.countedQty} onChange={(e) => { const n = [...li]; n[i] = { ...n[i], countedQty: parseFloat(e.target.value) || 0 }; setLi(n); }} className="w-24 text-right px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCd(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Count</Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={vd} onClose={() => { setVd(false); setSc(null); }} title={sc ? `Count ${sc.countNo}` : ''} size="xl">
        {sc && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Badge variant={sv[sc.status] || 'secondary'}>{COUNT_STATUS.find((s) => s.value === sc.status)?.label}</Badge>
              <span>By: {sc.countedBy?.name || '—'}</span>
              <span>{new Date(sc.createdAt).toLocaleDateString()}</span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">System</TableHead>
                  <TableHead className="text-right">Counted</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sc.lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono text-xs">{l.product.code}</TableCell>
                    <TableCell className="text-sm">{l.product.name}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{l.systemQty}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{l.countedQty}</TableCell>
                    <TableCell className={`text-right font-mono text-sm font-semibold ${l.variance !== 0 ? 'text-red-600' : 'text-slate-600'}`}>{l.variance > 0 ? '+' : ''}{l.variance}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {sc.status === 'completed' && vc(sc.lines) > 0 && (
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                <p className="text-sm text-amber-800">{vc(sc.lines)} item(s) have variance — adjustments will be created on approval</p>
                <Button onClick={handleApprove}><CheckCircle className="h-4 w-4 mr-2" />Approve</Button>
              </div>
            )}
            {sc.status === 'completed' && vc(sc.lines) === 0 && (
              <div className="flex justify-end"><Button onClick={handleApprove}><CheckCircle className="h-4 w-4 mr-2" />Approve (No Variances)</Button></div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => { setVd(false); setSc(null); }}>Close</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

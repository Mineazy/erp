'use client';

import { toast, dismissToast } from '@/components/ui/toast';
import { useState, useEffect, useRef, useMemo, type ReactNode, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Store, Plus, Search, Eye, Trash2, CheckCircle, PackageOpen, FileText, Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn } from '@/lib/utils';

interface LineItem {
  productId: string;
  productName: string;
  productCode: string;
  quantity: string;
}

function highlight(text: string, query: string): ReactNode {
  const q = query.trim().toLowerCase();
  if (!q || !text) return text;
  const lower = text.toLowerCase();
  const out: ReactNode[] = [];
  let i = 0;
  while (i < text.length) {
    const j = lower.indexOf(q, i);
    if (j === -1) { out.push(text.slice(i)); break; }
    if (j > i) out.push(text.slice(i, j));
    out.push(<mark key={j} className="rounded-sm bg-amber-200 px-0.5 text-inherit">{text.slice(j, j + q.length)}</mark>);
    i = j + q.length;
  }
  return out.length ? out : text;
}

function ProductPicker({ products, value, onSelect, warehouseId, selectedProduct }: { products: any[]; value: string; onSelect: (p: any) => void; warehouseId?: string; selectedProduct?: any }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dir, setDir] = useState<'up' | 'down'>('up');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [pos, setPos] = useState<{ left: number; width: number; top: number; bottom: number } | null>(null);
  const [serverResults, setServerResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selectedProductRef = useRef<any>(null);
  const allProducts = useMemo(() => {
    const map = new Map<string, any>();
    for (const p of products) map.set(p.id, p);
    for (const p of serverResults) if (!map.has(p.id)) map.set(p.id, p);
    return Array.from(map.values());
  }, [products, serverResults]);
  const selected = allProducts.find(p => p.id === value) || selectedProductRef.current || (selectedProduct && selectedProduct.id === value ? selectedProduct : null);

  useEffect(() => {
    if (!value) selectedProductRef.current = null;
  }, [value]);

  useEffect(() => {
    if (!open || !query.trim()) {
      setServerResults([]);
      return;
    }
    setSearching(true);
    const controller = new AbortController();
    const delay = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ search: query.trim(), limit: '50' });
        if (warehouseId) params.set('warehouseId', warehouseId);
        const res = await fetch(`/api/inventory/products?${params}`, { signal: controller.signal });
        if (res.ok) {
          const d = await res.json();
          setServerResults(d.items || []);
        }
      } catch {}
      setSearching(false);
    }, 250);
    return () => { clearTimeout(delay); controller.abort(); };
  }, [query, open, warehouseId]);

  const filtered = query.trim() ? serverResults : products;

  const measure = () => {
    const btn = buttonRef.current;
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    return { left: r.left, width: r.width, top: r.bottom + 4, bottom: window.innerHeight - r.top + 4 };
  };

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (
        (wrapRef.current && wrapRef.current.contains(e.target as Node)) ||
        (panelRef.current && panelRef.current.contains(e.target as Node))
      ) return;
      setOpen(false);
    }
    function reposition() {
      const p = measure();
      if (p) setPos(p);
    }
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  useEffect(() => {
    if (open) setActiveIndex(0);
  }, [open, query]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const handleToggle = () => {
    if (open) { setOpen(false); return; }
    const btn = buttonRef.current;
    const spaceAbove = btn ? btn.getBoundingClientRect().top : 400;
    setDir(spaceAbove > 340 ? 'up' : 'down');
    setPos(measure());
    setActiveIndex(0);
    setOpen(true);
  };

  const choose = (p: any) => {
    selectedProductRef.current = p;
    onSelect(p);
    setOpen(false);
    setQuery('');
    setActiveIndex(-1);
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setOpen(false); setQuery(''); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const p = filtered[activeIndex];
      if (p) choose(p);
    }
  };

  const searchBar = (
    <>
      <div className={cn('shrink-0 bg-white p-2', dir === 'up' ? 'border-t border-slate-100' : 'border-b border-slate-100')}>
        <Input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Search name, code, description..."
        />
      </div>
      <div className={cn('shrink-0 bg-slate-50 px-3 py-1 text-[11px] text-slate-500', dir === 'up' ? 'rounded-t-md border-t border-slate-100' : 'border-b border-slate-100')}>
        {query.trim() ? `${filtered.length} product${filtered.length === 1 ? '' : 's'} found` : `${filtered.length} product${filtered.length === 1 ? '' : 's'} in stock`}
        {searching && <span className="ml-1 animate-pulse">Searching...</span>}
        {!searching && <span className="ml-1">— use ↑ ↓ + Enter to select</span>}
      </div>
    </>
  );

  const optionList = (
    <div
      ref={listRef}
      role="listbox"
      className="max-h-56 overflow-y-auto"
    >
      {filtered.length === 0 ? (
        <div className="p-3 text-sm text-slate-400">{query.trim() ? `No products match "${query}"` : 'No products in this warehouse'}</div>
      ) : (
        filtered.map((p, index) => {
          const active = index === activeIndex;
          const stock = Number(p.stock ?? 0);
          return (
            <button
              key={p.id}
              type="button"
              role="option"
              aria-selected={active || p.id === value}
              data-active={active}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(p)}
              className={cn(
                'block w-full border-b border-slate-50 px-3 py-2 text-left transition-colors last:border-0',
                active ? 'bg-mine-blue-50' : 'hover:bg-slate-50',
                p.id === value && !active && 'bg-mine-blue-50/50'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{highlight(`${p.code} · ${p.name}`, query)}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={cn('text-xs font-medium', stock <= 0 ? 'text-red-600' : 'text-slate-500')}>
                    Stock: {stock}
                  </span>
                  <span className="text-xs font-medium text-emerald-600">${Number(p.sellingPrice || 0).toFixed(2)}</span>
                </div>
              </div>
              {p.description && <div className="mt-0.5 text-xs text-slate-500">{highlight(p.description, query)}</div>}
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                {p.category?.name && <span className="text-[11px] uppercase tracking-wide text-slate-400">{p.category.name}</span>}
                {p.availableLocations?.length > 0 && p.availableLocations.map((loc: string) => (
                  <span key={loc} className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    {loc}
                  </span>
                ))}
              </div>
            </button>
          );
        })
      )}
    </div>
  );

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm transition-colors hover:border-mine-blue-400 focus:outline-none focus:ring-2 focus:ring-mine-blue-500',
          open && 'border-mine-blue-400 ring-2 ring-mine-blue-500',
          selected && 'border-mine-blue-300'
        )}
      >
        {selected ? (
          <div>
            <span className="font-medium">{selected.code} · {selected.name}</span>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
              {selected.description && <span className="text-xs text-slate-500 truncate max-w-[55%]">{selected.description}</span>}
              <span className="text-xs font-medium text-emerald-600">${Number(selected.sellingPrice || 0).toFixed(2)}</span>
              <span className={cn('text-xs font-medium', Number(selected.stock ?? 0) <= 0 ? 'text-red-600' : 'text-slate-500')}>
                Stock: {Number(selected.stock ?? 0)}
              </span>
            </div>
          </div>
        ) : (
          <span className="text-slate-400">Select Product...</span>
        )}
      </button>

      {open && pos && createPortal(
        <div
          ref={panelRef}
          data-dialog-ignore
          style={{
            position: 'fixed',
            zIndex: 120,
            left: pos.left,
            width: pos.width,
            ...(dir === 'up' ? { bottom: pos.bottom } : { top: pos.top }),
          }}
          className="flex max-h-[24rem] flex-col rounded-md border border-slate-200 bg-white shadow-xl"
        >
          {dir === 'down' && searchBar}
          {optionList}
          {dir === 'up' && searchBar}
        </div>,
        document.body
      )}
    </div>
  );
}

export default function BranchOrdersPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [processLines, setProcessLines] = useState<{lineId: string; sentQty: string}[]>([]);
  const [receivedLines, setReceivedLines] = useState<{lineId: string; receivedQty: string}[]>([]);

  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineItem[]>([{ productId: '', productName: '', productCode: '', quantity: '1' }]);
  
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [myBranchId, setMyBranchId] = useState<string>(''); // For simplicity, we might just assume the backend infers it, but the POST requires toBranchId.
  // Wait, the API requires toBranchId. Let's fetch branches.
  const [branches, setBranches] = useState<any[]>([]);
  const [toBranchId, setToBranchId] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/inventory/branch-orders?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json.items || []);
    } catch {
      toast('Failed to fetch orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search, statusFilter]);

  useEffect(() => {
    fetch('/api/warehouse?limit=100').then(async r => { if (r.ok) { const d = await r.json(); setWarehouses(Array.isArray(d) ? d : (d.items || [])); } }).catch(() => {});
    fetch('/api/admin/branches').then(async r => { if (r.ok) { const d = await r.json(); setBranches(Array.isArray(d) ? d : (d.items || [])); } }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!fromWarehouseId) {
      setProducts([]);
      return;
    }
    fetch(`/api/inventory/products?limit=500&warehouseId=${fromWarehouseId}`).then(async r => { if (r.ok) { const d = await r.json(); setProducts(d.items || []); } }).catch(() => {});
  }, [fromWarehouseId]);

  const handleOpenNew = () => {
    const dc = warehouses.find(w => w.name?.toLowerCase().includes('dc') || w.code?.toLowerCase() === 'dc');
    setFromWarehouseId(dc ? dc.id : '');
    setToBranchId('');
    setNotes('');
    setLines([{ productId: '', productName: '', productCode: '', quantity: '1' }]);
    setProducts([]);
    setDialogOpen(true);
  };

  const handleSave = async (orderStatus: 'draft' | 'pending' = 'pending') => {
    if (!fromWarehouseId || !toBranchId) {
      toast('Please select a Warehouse and your Branch', 'error');
      return;
    }
    const invalidLines = lines.some(l => !l.productId || !l.quantity || Number(l.quantity) <= 0);
    if (invalidLines) {
      toast('Please select a product and valid quantities for all lines', 'error');
      return;
    }

    const tid = toast(orderStatus === 'draft' ? 'Saving draft...' : 'Creating stock order...', 'info', 120000);
    try {
      const payload = {
        fromWarehouseId,
        toBranchId,
        notes,
        status: orderStatus,
        lines: lines.map(l => ({ ...l, unitPrice: 0 }))
      };
      
      const res = await fetch('/api/inventory/branch-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Failed to save');
      }

      toast(orderStatus === 'draft' ? 'Draft saved successfully' : 'Order created successfully', 'success');
      setDialogOpen(false);
      fetchData();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      dismissToast(tid);
    }
  };

  const handleOpenEdit = async (order: any) => {
    setEditingOrder(order);
    setFromWarehouseId(order.fromWarehouseId || '');
    setToBranchId(order.toBranchId || '');
    setNotes(order.notes || '');
    setLines(order.lines.map((l: any) => ({
      productId: l.productId,
      productName: l.productName,
      productCode: l.productCode || '',
      quantity: String(l.quantity),
    })));
    setProducts([]);
    setEditDialogOpen(true);
    if (order.fromWarehouseId) {
      try {
        const res = await fetch(`/api/inventory/products?limit=500&warehouseId=${order.fromWarehouseId}`);
        const d = await res.json();
        setProducts(Array.isArray(d) ? d : d.items || []);
      } catch {}
    }
  };

  const handleUpdate = async (orderStatus: 'draft' | 'pending' = 'draft') => {
    if (!editingOrder) return;
    if (!fromWarehouseId || !toBranchId) {
      toast('Please select a Warehouse and your Branch', 'error');
      return;
    }
    const invalidLines = lines.some(l => !l.productId || !l.quantity || Number(l.quantity) <= 0);
    if (invalidLines) {
      toast('Please select a product and valid quantities for all lines', 'error');
      return;
    }
    const tid = toast('Updating order...', 'info', 120000);
    try {
      const payload = {
        fromWarehouseId,
        toBranchId,
        notes,
        status: orderStatus,
        lines: lines.map(l => ({ ...l, unitPrice: 0 })),
      };
      const res = await fetch(`/api/inventory/stock/transfers/${editingOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || 'Failed to update');
      }
      toast('Order updated successfully', 'success');
      setEditDialogOpen(false);
      setEditingOrder(null);
      fetchData();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      dismissToast(tid);
    }
  };

  const handleDelete = async (order: any) => {
    if (!confirm(`Delete order ${order.transferNo}? This cannot be undone.`)) return;
    const tid = toast('Deleting order...', 'info', 120000);
    try {
      const res = await fetch(`/api/inventory/stock/transfers/${order.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast('Order deleted', 'success');
      fetchData();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      dismissToast(tid);
    }
  };

  const handleSend = async (order: any) => {
    if (!confirm(`Send order ${order.transferNo}? This will deduct stock from the warehouse.`)) return;
    const tid = toast('Sending order...', 'info', 120000);
    try {
      const res = await fetch(`/api/inventory/stock/transfers/${order.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || 'Failed to send');
      }
      toast('Order sent successfully', 'success');
      setViewDialogOpen(false);
      fetchData();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      dismissToast(tid);
    }
  };

  const handleOpenProcess = (order: any) => {
    setSelectedOrder(order);
    setProcessLines(order.lines.map((l: any) => ({ lineId: l.id, sentQty: String(l.quantity) })));
    setProcessDialogOpen(true);
  };

  const handleProcessSubmit = async () => {
    if (!selectedOrder) return;
    const tid = toast('Processing order...', 'info', 120000);
    try {
      const res = await fetch(`/api/inventory/stock/transfers/${selectedOrder.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentLines: processLines }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || 'Failed to process');
      }
      const result = await res.json();
      if (result.backOrderCreated) {
        toast('Order processed. Back Order created for short-shipped items.', 'warning');
      } else {
        toast('Order processed and set to In-Transit', 'success');
      }
      setProcessDialogOpen(false);
      fetchData();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      dismissToast(tid);
    }
  };

  const handleOpenReceive = (order: any) => {
    setSelectedOrder(order);
    setReceivedLines(order.lines.map((l: any) => ({ lineId: l.id, receivedQty: l.quantity })));
    setReceiveDialogOpen(true);
  };

  const handleReceiveSubmit = async () => {
    if (!selectedOrder) return;
    const tid = toast('Receiving stock...', 'info', 120000);
    try {
      const res = await fetch(`/api/inventory/stock/transfers/${selectedOrder.id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receivedLines: receivedLines.map(rl => ({ lineId: rl.lineId, receivedQty: Number(rl.receivedQty) }))
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Failed to receive order');
      }

      toast('Stock received successfully', 'success');
      setReceiveDialogOpen(false);
      fetchData();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      dismissToast(tid);
    }
  };

  const fetchImageAsBase64 = async (url: string) => {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  };

  const printGoodsReceivedNote = async (t: any) => {
    const doc = new jsPDF();
    
    try {
      const logoBase64 = await fetchImageAsBase64('/logo.png');
      doc.addImage(logoBase64, 'PNG', 14, 10, 60, 20);
    } catch (e) {
      console.error('Failed to load logo', e);
    }

    doc.setFontSize(20);
    doc.text('Goods Received Note (GRN)', 14, 40);
    
    doc.setFontSize(12);
    doc.text(`Order No: ${t.transferNo}`, 14, 50);
    doc.text(`Status: ${t.status}`, 14, 57);
    doc.text(`Date Received: ${new Date(t.updatedAt || t.createdAt).toLocaleString()}`, 14, 64);
    
    doc.text(`From: ${t.fromWarehouse?.name || 'Warehouse'}`, 14, 77);
    doc.text(`To: ${t.toBranch?.name || 'Branch'}`, 14, 84);
    doc.text(`Requested By: ${t.requestedBy || 'N/A'}`, 14, 91);

    autoTable(doc, {
      startY: 105,
      head: [['ITEMS', 'REQUESTED QTY', 'DISPATCHED QTY', 'RECEIVED QTY', 'SECURITY CHECKBOX']],
      body: (t.lines || []).map((line: any) => [
        line.productName,
        line.quantity,
        line.quantity,
        line.receivedQty !== null ? line.receivedQty : line.quantity,
        ''
      ]),
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
    });
    
    let y = (doc as any).lastAutoTable.finalY + 15;
    
    doc.setFontSize(14);
    doc.text('Signatures:', 14, y);
    doc.setFontSize(12);
    y += 10;
    doc.text('Received By (Branch): _______________________  Sign: _________________  Date: _________', 14, y);
    y += 15;
    doc.text('Checked By (Manager): _______________________  Sign: _________________  Date: _________', 14, y);

    doc.save(`GRN_${t.transferNo}.pdf`);
  };

  const printBranchOrder = async (t: any) => {
    const doc = new jsPDF();
    
    try {
      const logoBase64 = await fetchImageAsBase64('/logo.png');
      doc.addImage(logoBase64, 'PNG', 14, 10, 60, 20);
    } catch (e) {
      console.error('Failed to load logo', e);
    }

    doc.setFontSize(20);
    doc.text('Branch Stock Order', 14, 40);
    
    doc.setFontSize(12);
    doc.text(`Order No: ${t.transferNo}`, 14, 50);
    doc.text(`Status: ${t.status}`, 14, 57);
    doc.text(`Date Ordered: ${new Date(t.createdAt).toLocaleString()}`, 14, 64);
    
    doc.text(`From: ${t.fromWarehouse?.name || 'Warehouse'}`, 14, 77);
    doc.text(`To: ${t.toBranch?.name || 'Branch'}`, 14, 84);
    doc.text(`Requested By: ${t.requestedBy || 'N/A'}`, 14, 91);

    autoTable(doc, {
      startY: 105,
      head: [['PRODUCT', 'REQUESTED QTY']],
      body: (t.lines || []).map((line: any) => [
        line.productName,
        line.quantity
      ]),
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
    });
    
    let y = (doc as any).lastAutoTable.finalY + 15;
    
    doc.setFontSize(12);
    doc.text('Authorized By (Manager): _______________________  Sign: _________________  Date: _________', 14, y);

    doc.save(`BranchOrder_${t.transferNo}.pdf`);
  };

  const printDispatchNote = async (t: any) => {
    const doc = new jsPDF();
    
    try {
      const logoBase64 = await fetchImageAsBase64('/logo.png');
      doc.addImage(logoBase64, 'PNG', 14, 10, 60, 20);
    } catch (e) {
      console.error('Failed to load logo', e);
    }

    doc.setFontSize(20);
    doc.text('Dispatch Note', 14, 40);
    
    doc.setFontSize(12);
    doc.text(`Order No: ${t.transferNo}`, 14, 50);
    doc.text(`Status: ${t.status.toUpperCase()}`, 14, 57);
    doc.text(`Date Dispatched: ${new Date().toLocaleString()}`, 14, 64);
    
    doc.text(`From: ${t.fromWarehouse?.name || 'Warehouse'}`, 14, 77);
    doc.text(`To: ${t.toBranch?.name || 'Branch'}`, 14, 84);
    doc.text(`Requested By: ${t.requestedBy || 'N/A'}`, 14, 91);

    autoTable(doc, {
      startY: 105,
      head: [['PRODUCT', 'REQUESTED QTY', 'SENT QTY']],
      body: (t.lines || []).map((line: any) => [
        `${line.productCode ? line.productCode + ' - ' : ''}${line.productName}`,
        line.quantity,
        line.sentQty !== null && line.sentQty !== undefined ? line.sentQty : line.quantity
      ]),
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
    });
    
    let y = (doc as any).lastAutoTable.finalY + 15;
    
    doc.setFontSize(14);
    doc.text('Signatures:', 14, y);
    doc.setFontSize(12);
    y += 10;
    doc.text('Dispatched By (Warehouse): _______________________  Sign: _________________  Date: _________', 14, y);
    y += 15;
    doc.text('Driver / Courier: _______________________  Sign: _________________  ID No: _________', 14, y);
    y += 15;
    doc.text('Received By (Branch): _______________________  Sign: _________________  Date: _________', 14, y);

    doc.save(`DispatchNote_${t.transferNo}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Branch Stock Orders</h2>
          <p className="text-slate-500 mt-1">Request stock from warehouses and manage incoming deliveries</p>
        </div>
        <Button onClick={handleOpenNew} className="bg-mine-blue-600 hover:bg-mine-blue-700">
          <Plus className="h-4 w-4 mr-2" /> New Stock Order
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-mine-blue-600" />
              Order History
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Search order no..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full sm:w-40">
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="in_transit">In Transit</option>
                <option value="received">Received</option>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Order No</TableHead>
                  <TableHead>From Warehouse</TableHead>
                  <TableHead>To Branch</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">Loading...</TableCell></TableRow>
                ) : data.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400">No stock orders found</TableCell></TableRow>
                ) : (
                  data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.transferNo}</TableCell>
                      <TableCell>{item.fromWarehouse?.name || 'N/A'}</TableCell>
                      <TableCell>{item.toBranch?.name || 'N/A'}</TableCell>
                      <TableCell>{item.requestedBy}</TableCell>
                      <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge className={
                          item.status === 'received' ? 'bg-emerald-100 text-emerald-800' :
                          item.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                          item.status === 'draft' ? 'bg-slate-200 text-slate-700' :
                          item.status === 'in_transit' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
                        }>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedOrder(item); setViewDialogOpen(true); }}>
                          <Eye className="h-4 w-4 mr-1 text-slate-600" />
                          View
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => printBranchOrder(item)} title="Download Order PDF">
                          <FileText className="h-4 w-4 mr-1 text-purple-600" />
                          PDF
                        </Button>
                        {item.status === 'draft' && (
                          <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(item)}>
                            <Pencil className="h-4 w-4 mr-1 text-amber-600" />
                            Edit
                          </Button>
                        )}
                        {item.status === 'draft' && (
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(item)} className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        )}
                        {item.status === 'pending' && (
                          <Button variant="ghost" size="sm" onClick={() => handleOpenProcess(item)}>
                            <CheckCircle className="h-4 w-4 mr-1 text-emerald-600" />
                            Process
                          </Button>
                        )}
                        {item.status === 'in_transit' && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => printDispatchNote(item)} title="Download Dispatch Note">
                              <FileText className="h-4 w-4 mr-1 text-blue-600" />
                              Dispatch
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleOpenReceive(item)}>
                              <PackageOpen className="h-4 w-4 mr-1 text-emerald-600" />
                              Receive
                            </Button>
                          </>
                        )}
                        {item.status === 'received' && (
                          <Button variant="ghost" size="sm" onClick={() => printGoodsReceivedNote(item)} title="Download GRN">
                            <FileText className="h-4 w-4 mr-1 text-mine-blue-600" />
                            GRN
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Order Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} size="5xl" className="max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">View Stock Order: {selectedOrder?.transferNo}</h3>
            <Badge className={
              selectedOrder?.status === 'received' ? 'bg-emerald-100 text-emerald-800' :
              selectedOrder?.status === 'pending' ? 'bg-amber-100 text-amber-800' :
              selectedOrder?.status === 'draft' ? 'bg-slate-200 text-slate-700' :
              selectedOrder?.status === 'in_transit' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
            }>
              {selectedOrder?.status}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <p className="text-slate-500 font-medium">From Warehouse</p>
              <p>{selectedOrder?.fromWarehouse?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">To Branch</p>
              <p>{selectedOrder?.toBranch?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">Requested By</p>
              <p>{selectedOrder?.requestedBy || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">Date</p>
              <p>{selectedOrder?.createdAt ? new Date(selectedOrder.createdAt).toLocaleDateString() : 'N/A'}</p>
            </div>
            {selectedOrder?.notes && (
              <div className="col-span-2">
                <p className="text-slate-500 font-medium">Notes</p>
                <p>{selectedOrder.notes}</p>
              </div>
            )}
          </div>

          <Separator className="my-4" />
          <h4 className="font-semibold mb-3">Line Items</h4>
          <div className="border rounded-md overflow-x-auto mb-4">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Product Code</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Requested Qty</TableHead>
                  <TableHead>Sent Qty</TableHead>
                  <TableHead>Received Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedOrder?.lines?.map((line: any) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-mono text-xs">{line.productCode || '-'}</TableCell>
                    <TableCell>{line.productName}</TableCell>
                    <TableCell>{line.quantity}</TableCell>
                    <TableCell>{line.sentQty !== null && line.sentQty !== undefined ? line.sentQty : '-'}</TableCell>
                    <TableCell>{line.receivedQty !== null ? line.receivedQty : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
            {(selectedOrder?.status === 'draft' || selectedOrder?.status === 'pending') && (
              <Button onClick={() => handleSend(selectedOrder)} className="bg-emerald-600 hover:bg-emerald-700">
                <PackageOpen className="h-4 w-4 mr-1" /> Send Order
              </Button>
            )}
          </DialogFooter>
        </div>
      </Dialog>

      {/* Create Order Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} size="full" bounded>
        <div className="p-6">
          <h3 className="text-lg font-bold mb-4">Create Branch Stock Order</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <Label>Request From Warehouse *</Label>
              <Select value={fromWarehouseId} onChange={e => setFromWarehouseId(e.target.value)}>
                <option value="">Select Warehouse...</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
            </div>
            <div>
              <Label>Your Branch *</Label>
              <Select value={toBranchId} onChange={e => setToBranchId(e.target.value)}>
                <option value="">Select Branch...</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Notes (Optional)</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Urgent order, etc." />
            </div>
          </div>

          <Separator className="my-4" />
          <h4 className="font-semibold mb-3">Line Items</h4>
          <div className="border rounded-md overflow-x-auto mb-4">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="w-32">Quantity</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-xs text-slate-400 font-mono text-center">{index + 1}</TableCell>
                    <TableCell className="min-w-[320px]">
                      <ProductPicker
                        products={products}
                        value={line.productId}
                        warehouseId={fromWarehouseId}
                        selectedProduct={line.productId ? { id: line.productId, name: line.productName, code: line.productCode } : undefined}
                        onSelect={(p) => {
                          const newLines = [...lines];
                          newLines[index] = { ...line, productId: p?.id || '', productName: p?.name || '', productCode: p?.code || '' };
                          setLines(newLines);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input type="number" min="1" value={line.quantity} onChange={e => { const l=[...lines]; l[index].quantity=e.target.value; setLines(l); }} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => {
                        if (lines.length > 1) { const l = [...lines]; l.splice(index, 1); setLines(l); }
                      }}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-slate-50 font-semibold">
                  <TableCell className="text-xs text-slate-500 text-center">Total</TableCell>
                  <TableCell className="text-sm text-slate-700">{lines.length} item{lines.length !== 1 ? 's' : ''}</TableCell>
                  <TableCell className="text-sm text-slate-700 font-mono">{lines.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <Button variant="outline" size="sm" onClick={() => setLines([...lines, { productId: '', productName: '', productCode: '', quantity: '1' }])}>+ Add Product</Button>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => handleSave('draft')} className="border-slate-300 text-slate-700 hover:bg-slate-50">Save as Draft</Button>
            <Button onClick={() => handleSave('pending')} className="bg-mine-blue-600 hover:bg-mine-blue-700">Submit Order</Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} size="full" bounded>
        <div className="p-6">
          <h3 className="text-lg font-bold mb-4">Edit Branch Stock Order — {editingOrder?.transferNo}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <Label>Request From Warehouse *</Label>
              <Select value={fromWarehouseId} onChange={e => {
                setFromWarehouseId(e.target.value);
                setLines(lines.map(l => ({ ...l, productId: '', productName: '', productCode: '' })));
                if (e.target.value) {
                  fetch(`/api/inventory/products?limit=10000&warehouseId=${e.target.value}`)
                    .then(r => r.json())
                    .then(d => setProducts(Array.isArray(d) ? d : d.items || []))
                    .catch(() => {});
                }
              }}>
                <option value="">Select Warehouse...</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
            </div>
            <div>
              <Label>Your Branch *</Label>
              <Select value={toBranchId} onChange={e => setToBranchId(e.target.value)}>
                <option value="">Select Branch...</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Notes (Optional)</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Urgent order, etc." />
            </div>
          </div>

          <Separator className="my-4" />
          <h4 className="font-semibold mb-3">Line Items</h4>
          <div className="border rounded-md overflow-x-auto mb-4">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="w-32">Quantity</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-xs text-slate-400 font-mono text-center">{index + 1}</TableCell>
                    <TableCell className="min-w-[320px]">
                      <ProductPicker
                        products={products}
                        value={line.productId}
                        warehouseId={fromWarehouseId}
                        selectedProduct={line.productId ? { id: line.productId, name: line.productName, code: line.productCode } : undefined}
                        onSelect={(p) => {
                          const newLines = [...lines];
                          newLines[index] = { ...line, productId: p?.id || '', productName: p?.name || '', productCode: p?.code || '' };
                          setLines(newLines);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input type="number" min="1" value={line.quantity} onChange={e => { const l=[...lines]; l[index].quantity=e.target.value; setLines(l); }} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => {
                        if (lines.length > 1) { const l = [...lines]; l.splice(index, 1); setLines(l); }
                      }}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-slate-50 font-semibold">
                  <TableCell className="text-xs text-slate-500 text-center">Total</TableCell>
                  <TableCell className="text-sm text-slate-700">{lines.length} item{lines.length !== 1 ? 's' : ''}</TableCell>
                  <TableCell className="text-sm text-slate-700 font-mono">{lines.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <Button variant="outline" size="sm" onClick={() => setLines([...lines, { productId: '', productName: '', productCode: '', quantity: '1' }])}>+ Add Product</Button>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => handleUpdate('draft')} className="border-slate-300 text-slate-700 hover:bg-slate-50">Save as Draft</Button>
            <Button onClick={() => handleUpdate('pending')} className="bg-mine-blue-600 hover:bg-mine-blue-700">Submit Order</Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* Process Order Dialog (Warehouse - enter sent quantities) */}
      <Dialog open={processDialogOpen} onClose={() => setProcessDialogOpen(false)} size="lg">
        <div className="p-6">
          <h3 className="text-lg font-bold mb-1">Process Order — {selectedOrder?.transferNo}</h3>
          <p className="text-sm text-slate-500 mb-4">Enter the actual quantity being sent for each line item. Order will be set to In-Transit.</p>

          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <p className="text-slate-500 font-medium">From Warehouse</p>
              <p>{selectedOrder?.fromWarehouse?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">To Branch</p>
              <p>{selectedOrder?.toBranch?.name || 'N/A'}</p>
            </div>
          </div>

          <div className="border rounded-md overflow-x-auto mb-4">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="w-28">Requested Qty</TableHead>
                  <TableHead className="w-28">Sent Qty *</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedOrder?.lines?.map((line: any) => {
                  const pl = processLines.find(p => p.lineId === line.id);
                  return (
                    <TableRow key={line.id}>
                      <TableCell>
                        <span className="text-xs font-mono text-slate-500">{line.productCode}</span>
                        <span className="ml-2">{line.productName}</span>
                      </TableCell>
                      <TableCell className="font-mono">{Number(line.quantity)}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={pl?.sentQty || ''}
                          onChange={e => {
                            setProcessLines(processLines.map(p =>
                              p.lineId === line.id ? { ...p, sentQty: e.target.value } : p
                            ));
                          }}
                          className="w-24"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProcessDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleProcessSubmit} className="bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle className="h-4 w-4 mr-1" /> Send &amp; Set In-Transit
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
      
      {/* Receive Order Dialog */}
      <Dialog open={receiveDialogOpen} onClose={() => setReceiveDialogOpen(false)} className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-bold mb-4">Receive Stock Order {selectedOrder?.transferNo}</h3>
          <p className="text-slate-500 mb-4 text-sm">Please verify the quantities received. Any discrepancies will remain in the L99 Transit Warehouse for manual investigation.</p>
          
          <div className="border rounded-md overflow-x-auto mb-4">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Shipped Qty</TableHead>
                  <TableHead className="w-32">Received Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedOrder?.lines.map((line: any, index: number) => (
                  <TableRow key={line.id}>
                    <TableCell>{line.productName}</TableCell>
                    <TableCell>{line.quantity}</TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        min="0" 
                        max={line.quantity}
                        value={receivedLines.find(rl => rl.lineId === line.id)?.receivedQty || '0'} 
                        onChange={e => { 
                          const updated = [...receivedLines];
                          const idx = updated.findIndex(rl => rl.lineId === line.id);
                          if (idx >= 0) updated[idx].receivedQty = e.target.value;
                          setReceivedLines(updated); 
                        }} 
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setReceiveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleReceiveSubmit} className="bg-emerald-600 hover:bg-emerald-700">Confirm Receipt</Button>
          </DialogFooter>
        </div>
      </Dialog>

    </div>
  );
}

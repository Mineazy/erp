'use client';

import { toast, dismissToast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Package, Plus, Search, Edit2, Archive, AlertTriangle, Upload, Download, History, Building2, ArrowLeftRight, DollarSign, Percent, TrendingUp, TrendingDown } from 'lucide-react';

interface Product {
  id: string;
  code: string;
  name: string;
  category?: { id: string; name: string } | null;
  branch?: { id: string; code: string; name: string } | null;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  maxStock: number;
  isActive: boolean;
  location: string;
  barcode: string;
  createdAt: string;
  availableLocations?: string[];
}

interface ProductCategory {
  id: string;
  name: string;
}

interface HistoryRecord {
  id: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  action: string;
  userName: string | null;
  createdAt: string;
}

interface BranchStock {
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  location: string | null;
  batchNo: string | null;
}

const emptyForm = { code: '', name: '', categoryId: '', unit: '', costPrice: 0, sellingPrice: 0, stock: 0, minStock: 0, maxStock: 0, location: '', barcode: '', branchId: '' };

export default function ProductsPage() {
  const [data, setData] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [branches, setBranches] = useState<{ id: string; code: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [dashboardStats, setDashboardStats] = useState({ totalProducts: 0, lowStockCount: 0, outOfStockCount: 0, categorySummary: [] as { id: string, name: string, productCount: number }[] });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyData, setHistoryData] = useState<HistoryRecord[]>([]);
  const [historyProductName, setHistoryProductName] = useState('');
  const [branchStockDialogOpen, setBranchStockDialogOpen] = useState(false);
  const [branchStockData, setBranchStockData] = useState<BranchStock[]>([]);
  const [branchStockProductName, setBranchStockProductName] = useState('');

  const [priceAdjustDialogOpen, setPriceAdjustDialogOpen] = useState(false);
  const [priceAdjustProduct, setPriceAdjustProduct] = useState<Product | null>(null);
  const [priceAdjustType, setPriceAdjustType] = useState<'cost_price' | 'selling_price'>('selling_price');
  const [priceAdjustNewPrice, setPriceAdjustNewPrice] = useState('');
  const [priceAdjustReason, setPriceAdjustReason] = useState('');
  const [priceAdjustLoading, setPriceAdjustLoading] = useState(false);

  const [bulkAdjustDialogOpen, setBulkAdjustDialogOpen] = useState(false);
  const [bulkAdjustType, setBulkAdjustType] = useState<'cost_price' | 'selling_price'>('selling_price');
  const [bulkAdjustMode, setBulkAdjustMode] = useState<'percentage' | 'fixed'>('percentage');
  const [bulkAdjustValue, setBulkAdjustValue] = useState('');
  const [bulkAdjustCategory, setBulkAdjustCategory] = useState('');
  const [bulkAdjustReason, setBulkAdjustReason] = useState('');
  const [bulkAdjustLoading, setBulkAdjustLoading] = useState(false);
  const [bulkAdjustPreview, setBulkAdjustPreview] = useState<any[] | null>(null);
  const [bulkAdjustStep, setBulkAdjustStep] = useState<'configure' | 'preview' | 'result'>('configure');
  const [bulkAdjustResult, setBulkAdjustResult] = useState<any>(null);

  const [priceHistoryDialogOpen, setPriceHistoryDialogOpen] = useState(false);
  const [priceHistoryData, setPriceHistoryData] = useState<any[]>([]);
  const [priceHistoryProductName, setPriceHistoryProductName] = useState('');
  const [priceHistoryLoading, setPriceHistoryLoading] = useState(false);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [selectedCategoryForModal, setSelectedCategoryForModal] = useState<{id: string, name: string} | null>(null);
  const [categoryModalProducts, setCategoryModalProducts] = useState<Product[]>([]);
  const [categoryModalTotal, setCategoryModalTotal] = useState(0);
  const [categoryModalSearch, setCategoryModalSearch] = useState('');
  const [categoryModalActiveSearch, setCategoryModalActiveSearch] = useState('');
  const [categoryModalPage, setCategoryModalPage] = useState(1);
  const [categoryModalLoading, setCategoryModalLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeSearch) params.set('search', activeSearch);
      if (filterCategory) params.set('categoryId', filterCategory);
      params.set('page', String(page));
      params.set('limit', '50');
      const res = await fetch(`/api/inventory/products?${params}`);
      if (!res.ok) {
        let errText = '';
        try { errText = JSON.stringify(await res.json()); } catch { errText = await res.text(); }
        console.error('SERVER GET ERROR:', res.status, errText);
        throw new Error('Failed to fetch: ' + errText);
      }
      const json = await res.json();
      setData(json.items ?? json);
      setTotal(json.total ?? 0);
    } catch (e) {
      console.error('Failed to fetch products', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/inventory/categories');
      if (res.ok) setCategories(await res.json());
    } catch (e) { console.error('Failed to fetch categories', e); }
  };

  const fetchDashboardStats = async () => {
    try {
      const res = await fetch('/api/inventory/dashboard');
      if (res.ok) {
        const json = await res.json();
        setDashboardStats(json.data || json);
      }
    } catch (e) { console.error('Failed to fetch dashboard stats', e); }
  };

  useEffect(() => { fetchData(); }, [activeSearch, filterCategory, page]);
  useEffect(() => { fetchCategories(); fetchDashboardStats(); }, []);

  const fetchCategoryModalData = async () => {
    if (!selectedCategoryForModal) return;
    try {
      setCategoryModalLoading(true);
      const params = new URLSearchParams();
      if (categoryModalActiveSearch) params.set('search', categoryModalActiveSearch);
      params.set('categoryId', selectedCategoryForModal.id);
      params.set('page', String(categoryModalPage));
      params.set('limit', '10');
      const res = await fetch(`/api/inventory/products?${params}`);
      if (res.ok) {
        const json = await res.json();
        setCategoryModalProducts(json.items ?? json);
        setCategoryModalTotal(json.total ?? 0);
      }
    } catch (e) {
      console.error('Failed to fetch category products', e);
    } finally {
      setCategoryModalLoading(false);
    }
  };

  useEffect(() => {
    if (categoryModalOpen && selectedCategoryForModal) {
      fetchCategoryModalData();
    }
  }, [categoryModalOpen, selectedCategoryForModal, categoryModalActiveSearch, categoryModalPage]);

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/admin/branches');
      if (res.ok) {
        const json = await res.json();
        setBranches(json.data || json);
      }
    } catch (_) {}
  };

  useEffect(() => { fetchBranches(); }, []);


  const openCreate = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({ code: product.code, name: product.name, categoryId: product.category?.id || '', unit: product.unit, costPrice: product.costPrice, sellingPrice: product.sellingPrice, stock: product.stock, minStock: product.minStock, maxStock: product.maxStock || 0, location: product.location || '', barcode: product.barcode || '', branchId: product.branch?.id || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      let res;
      let tid;
      if (editingProduct) {
        tid = toast('Updating product...', 'info', 120000);
        try { res = await fetch(`/api/inventory/products/${editingProduct.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); } catch (e) { dismissToast(tid); throw e; }
      } else {
        tid = toast('Saving product...', 'info', 120000);
        try { res = await fetch('/api/inventory/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); } catch (e) { dismissToast(tid); throw e; }
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to save product', 'error');
        return;
      }
      dismissToast(tid);
      toast((editingProduct ? 'Product updated' : 'Product created') + ' successfully', 'success');
      setDialogOpen(false);
      setEditingProduct(null);
      fetchData();
      fetchDashboardStats();
      if (categoryModalOpen) fetchCategoryModalData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({ title: 'Delete Product', message: 'Are you sure you want to delete this product?', variant: 'danger' }); if (!ok) return;
    try {
      const tid = toast('Deleting product...', 'info', 120000);
      let res;
      try { res = await fetch(`/api/inventory/products/${id}`, { method: 'DELETE' }); } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Delete failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to delete product', 'error');
        return;
      }
      dismissToast(tid);
      toast('Product deleted successfully', 'success');
      fetchData();
      fetchDashboardStats();
      if (categoryModalOpen) fetchCategoryModalData();
    } catch (e) { toast('Network error. Please try again.', 'error'); }
  };

  const handleArchive = async (product: Product) => {
    const action = product.isActive ? 'archive' : 'restore';
    const ok = await confirmDialog({ title: `${action === 'archive' ? 'Archive' : 'Restore'} Product`, message: `Are you sure you want to ${action} "${product.name}"?`, variant: action === 'archive' ? 'danger' : 'info' }); if (!ok) return;
    try {
      const tid = toast(`${action === 'archive' ? 'Archiving' : 'Restoring'} product...`, 'info', 120000);
      const res = await fetch(`/api/inventory/products/${product.id}/archive`, { method: 'POST' });
      if (!res.ok) { dismissToast(tid); toast(`Failed to ${action} product`, 'error'); return; }
      dismissToast(tid);
      toast(`Product ${action}d successfully`, 'success');
      fetchData();
      fetchDashboardStats();
      if (categoryModalOpen) fetchCategoryModalData();
    } catch (e) { toast('Network error', 'error'); }
  };

  const openHistory = async (product: Product) => {
    setHistoryProductName(product.name);
    try {
      const res = await fetch(`/api/inventory/products/${product.id}/history`);
      if (res.ok) setHistoryData(await res.json());
      else setHistoryData([]);
    } catch { setHistoryData([]); }
    setHistoryDialogOpen(true);
  };

  const openBranchStock = async (product: Product) => {
    setBranchStockProductName(product.name);
    try {
      const res = await fetch(`/api/inventory/products/${product.id}/branch-stock`);
      if (res.ok) setBranchStockData(await res.json());
      else setBranchStockData([]);
    } catch { setBranchStockData([]); }
    setBranchStockDialogOpen(true);
  };

  const openPriceAdjust = (product: Product) => {
    setPriceAdjustProduct(product);
    setPriceAdjustType('selling_price');
    setPriceAdjustNewPrice(String(product.sellingPrice));
    setPriceAdjustReason('');
    setPriceAdjustDialogOpen(true);
  };

  const handlePriceAdjust = async () => {
    if (!priceAdjustProduct) return;
    const newPrice = parseFloat(priceAdjustNewPrice);
    if (isNaN(newPrice) || newPrice < 0) { toast('Invalid price', 'error'); return; }
    setPriceAdjustLoading(true);
    try {
      const tid = toast('Adjusting price...', 'info', 120000);
      const res = await fetch(`/api/inventory/products/${priceAdjustProduct.id}/adjust-price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceType: priceAdjustType, newPrice, reason: priceAdjustReason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }));
        dismissToast(tid); toast(err.error || 'Failed to adjust price', 'error'); return;
      }
      dismissToast(tid);
      toast('Price adjusted successfully', 'success');
      setPriceAdjustDialogOpen(false);
      fetchData();
      if (categoryModalOpen) fetchCategoryModalData();
    } catch { toast('Network error', 'error'); }
    finally { setPriceAdjustLoading(false); }
  };

  const openBulkAdjust = () => {
    setBulkAdjustType('selling_price');
    setBulkAdjustMode('percentage');
    setBulkAdjustValue('');
    setBulkAdjustCategory('');
    setBulkAdjustReason('');
    setBulkAdjustPreview(null);
    setBulkAdjustResult(null);
    setBulkAdjustStep('configure');
    setBulkAdjustDialogOpen(true);
  };

  const fetchBulkPreview = async () => {
    const val = parseFloat(bulkAdjustValue);
    if (isNaN(val)) { toast('Enter a valid adjustment value', 'error'); return; }
    setBulkAdjustLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '200');
      if (bulkAdjustCategory) params.set('categoryId', bulkAdjustCategory);
      const res = await fetch(`/api/inventory/products?${params}`);
      if (!res.ok) { toast('Failed to fetch products', 'error'); return; }
      const json = await res.json();
      const products = json.items ?? json;
      const priceField = bulkAdjustType === 'cost_price' ? 'costPrice' : 'sellingPrice';
      const preview = products.map((p: any) => {
        const old = Number(p[priceField]);
        let newP: number;
        if (bulkAdjustMode === 'percentage') {
          newP = Math.round(old * (1 + val / 100) * 100) / 100;
        } else {
          newP = Math.round((old + val) * 100) / 100;
        }
        if (newP < 0) newP = 0;
        return { id: p.id, code: p.code, name: p.name, oldPrice: old, newPrice: newP, change: newP - old };
      }).filter((p: any) => p.change !== 0);
      setBulkAdjustPreview(preview);
      setBulkAdjustStep('preview');
    } catch { toast('Network error', 'error'); }
    finally { setBulkAdjustLoading(false); }
  };

  const handleBulkAdjust = async () => {
    setBulkAdjustLoading(true);
    try {
      const tid = toast('Applying bulk price adjustment...', 'info', 120000);
      const res = await fetch('/api/inventory/products/adjust-price-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: bulkAdjustPreview?.map(p => p.id),
          priceType: bulkAdjustType,
          adjustmentType: bulkAdjustMode,
          adjustmentValue: parseFloat(bulkAdjustValue),
          reason: bulkAdjustReason,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }));
        dismissToast(tid); toast(err.error || 'Failed to adjust prices', 'error'); return;
      }
      const result = await res.json();
      dismissToast(tid);
      toast(`${result.data?.updated || result.updated || 0} products updated`, 'success');
      setBulkAdjustResult(result.data || result);
      setBulkAdjustStep('result');
      fetchData();
      if (categoryModalOpen) fetchCategoryModalData();
    } catch { toast('Network error', 'error'); }
    finally { setBulkAdjustLoading(false); }
  };

  const openPriceHistory = async (product?: Product) => {
    if (product) {
      setPriceHistoryProductName(product.name);
    } else {
      setPriceHistoryProductName('All Products');
    }
    setPriceHistoryLoading(true);
    setPriceHistoryDialogOpen(true);
    try {
      const params = new URLSearchParams();
      if (product) params.set('productId', product.id);
      params.set('limit', '100');
      const res = await fetch(`/api/inventory/price-history?${params}`);
      if (res.ok) {
        const json = await res.json();
        setPriceHistoryData(json.items || []);
      } else {
        setPriceHistoryData([]);
      }
    } catch { setPriceHistoryData([]); }
    finally { setPriceHistoryLoading(false); }
  };

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ row: number; status: string; product?: any; error?: string }[] | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const downloadTemplate = async () => {
    try {
      const res = await fetch('/api/inventory/import');
      if (!res.ok) { toast('Failed to download template', 'error'); return; }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'product_import_template.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch { toast('Network error', 'error'); }
  };

  const handleImport = async () => {
    if (!selectedFile) { toast('Please select a file', 'error'); return; }
    setImporting(true);
    setImportResults(null);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      const res = await fetch('/api/inventory/import', { method: 'POST', body: fd });
      if (!res.ok) { const err = await res.json().catch(() => ({})); toast(err.error || 'Import failed', 'error'); return; }
      const json = await res.json();
      const d = json.data || json;
      setImportResults(d.results || []);
      toast(`${d.successCount || 0} products imported, ${d.errorCount || 0} errors`, d.errorCount > 0 ? 'warning' : 'success');
      if (d.successCount > 0) {
        fetchData();
        fetchDashboardStats();
      }
    } catch { toast('Import failed. Please try again.', 'error'); }
    finally { setImporting(false); }
  };

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Products</h2>
          <p className="text-slate-500 mt-1">Manage your product catalog and inventory</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => openPriceHistory()}><History className="h-4 w-4 mr-2" />Price History</Button>
          <Button variant="outline" onClick={openBulkAdjust}><TrendingUp className="h-4 w-4 mr-2" />Bulk Adjust</Button>
          <Button variant="outline" onClick={downloadTemplate}><Download className="h-4 w-4 mr-2" />Template</Button>
          <Button variant="outline" onClick={() => { setImportDialogOpen(true); setSelectedFile(null); setImportResults(null); }}><Upload className="h-4 w-4 mr-2" />Import</Button>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Product</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-sm text-slate-500">Total Products</p><p className="text-xl font-bold text-slate-900">{dashboardStats.totalProducts || 0}</p></div>
          <div className="p-2 bg-blue-50 rounded-lg"><Package className="h-5 w-5 text-mine-blue-800" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-sm text-slate-500">Low Stock Items</p><p className="text-xl font-bold text-amber-600">{dashboardStats.lowStockCount || 0}</p></div>
          <div className="p-2 bg-amber-50 rounded-lg"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-sm text-slate-500">Out of Stock</p><p className="text-xl font-bold text-red-600">{dashboardStats.outOfStockCount || 0}</p></div>
          <div className="p-2 bg-red-50 rounded-lg"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
        </CardContent></Card>
      </div>

      {dashboardStats.categorySummary && dashboardStats.categorySummary.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-3">Products by Category</h3>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200">
            {dashboardStats.categorySummary.map(cat => (
              <Card key={cat.id} className="min-w-[200px] shrink-0 border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => {
                setSelectedCategoryForModal({ id: cat.id, name: cat.name });
                setCategoryModalSearch('');
                setCategoryModalActiveSearch('');
                setCategoryModalPage(1);
                setCategoryModalOpen(true);
              }}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 truncate max-w-[130px]" title={cat.name}>{cat.name}</p>
                    <p className="text-xl font-bold text-slate-900">{cat.productCount}</p>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100"><Package className="h-4 w-4 text-slate-400" /></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2"><Package className="h-5 w-5 text-mine-blue-800" />Product List</CardTitle>
            <div className="flex items-center gap-2">
              <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 bg-white min-w-[150px]">
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="text" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { setActiveSearch(search); setPage(1); } }} className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-64" />
              </div>
              <Button variant="default" size="sm" onClick={() => { setActiveSearch(search); setPage(1); }}>Search</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Cost Price</TableHead>
                <TableHead className="text-right">Selling Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((product) => (
                <TableRow key={product.id} className={!product.isActive ? 'opacity-60' : ''}>
                  <TableCell className="font-mono text-xs font-medium">{product.code}</TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.category?.name || '—'}</TableCell>
                  <TableCell className="text-xs text-slate-600">{product.branch?.name || '—'}</TableCell>
                  <TableCell>{product.unit}</TableCell>
                  <TableCell className="text-right font-mono">${product.costPrice.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono">${product.sellingPrice.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <span className={`font-mono font-medium ${product.stock <= product.minStock && product.stock > 0 && product.isActive ? 'text-amber-600' : product.stock === 0 ? 'text-red-600' : 'text-slate-900'}`}>{product.stock}</span>
                    {product.stock <= product.minStock && product.stock > 0 && <span className="ml-1 text-xs text-amber-500">(Low)</span>}
                    {product.availableLocations && product.availableLocations.length > 0 && (
                      <div className="flex justify-end gap-1 mt-1 flex-wrap">
                        {product.availableLocations.map(loc => <Badge key={loc} variant="outline" className="text-[10px] px-1 py-0">{loc}</Badge>)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell><Badge variant={product.isActive ? 'success' : 'secondary'}>{product.isActive ? 'Active' : 'Archived'}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openPriceAdjust(product)} className="p-1.5 hover:bg-emerald-50 rounded" title="Adjust Price"><DollarSign className="h-4 w-4 text-emerald-500" /></button>
                      <button onClick={() => openEdit(product)} className="p-1.5 hover:bg-slate-100 rounded" title="Edit"><Edit2 className="h-4 w-4 text-slate-400" /></button>
                      <button onClick={() => openHistory(product)} className="p-1.5 hover:bg-slate-100 rounded" title="View History"><History className="h-4 w-4 text-slate-400" /></button>
                      <button onClick={() => openBranchStock(product)} className="p-1.5 hover:bg-slate-100 rounded" title="Stock by Branch"><Building2 className="h-4 w-4 text-slate-400" /></button>
                      <button onClick={() => handleArchive(product)} className="p-1.5 hover:bg-amber-50 rounded" title={product.isActive ? 'Archive' : 'Restore'}><Archive className={`h-4 w-4 ${product.isActive ? 'text-amber-400' : 'text-green-400'}`} /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
            <div>
              Showing {data.length > 0 ? (page - 1) * 50 + 1 : 0} to {Math.min(page * 50, total)} of {total} products
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>
                Previous
              </Button>
              <div className="px-2 font-medium">Page {page} of {Math.max(1, Math.ceil(total / 50))}</div>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 50) || loading}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Modal */}
      <Dialog open={categoryModalOpen} onClose={() => setCategoryModalOpen(false)} title={`Products in ${selectedCategoryForModal?.name}`} size="xl">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search category products..." value={categoryModalSearch} onChange={(e) => setCategoryModalSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { setCategoryModalActiveSearch(categoryModalSearch); setCategoryModalPage(1); } }} className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-full" />
            </div>
            <Button variant="default" size="sm" onClick={() => { setCategoryModalActiveSearch(categoryModalSearch); setCategoryModalPage(1); }}>Search</Button>
          </div>
          {categoryModalLoading ? (
            <div className="text-center text-slate-500 py-4">Loading...</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryModalProducts.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-4 text-slate-500">No products found.</TableCell></TableRow>
                  ) : (
                    categoryModalProducts.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.code}</TableCell>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-right">${Number(p.sellingPrice).toFixed(2)}</TableCell>
                        <TableCell className="text-right">{p.stock}</TableCell>
                        <TableCell><Badge variant={p.isActive ? 'success' : 'secondary'}>{p.isActive ? 'Active' : 'Archived'}</Badge></TableCell>
                        <TableCell className="text-right">
                          <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-mine-blue-600 transition-colors" title="Edit Product"><Edit2 className="h-4 w-4" /></button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
                <div>
                  Showing {categoryModalProducts.length > 0 ? (categoryModalPage - 1) * 10 + 1 : 0} to {Math.min(categoryModalPage * 10, categoryModalTotal)} of {categoryModalTotal}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCategoryModalPage(p => Math.max(1, p - 1))} disabled={categoryModalPage === 1}>Previous</Button>
                  <Button variant="outline" size="sm" onClick={() => setCategoryModalPage(p => p + 1)} disabled={categoryModalPage >= Math.ceil(categoryModalTotal / 10)}>Next</Button>
                </div>
              </div>
            </>
          )}
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setCategoryModalOpen(false)}>Close</Button></DialogFooter>
      </Dialog>

      {/* Product Dialog */}
      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditingProduct(null); }} title={editingProduct ? 'Edit Product' : 'Add Product'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Product Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. MIN-008" />
            <Input label="Product Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mining Lamp" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Category" options={categories.map((c) => ({ value: c.id, label: c.name }))} placeholder="Select category" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} />
            <Select label="Unit" options={[{ value: 'each', label: 'Each' }, { value: 'kg', label: 'Kilogram' }, { value: 'ton', label: 'Ton' }, { value: 'liter', label: 'Liter' }, { value: 'meter', label: 'Meter' }, { value: 'box', label: 'Box' }]} placeholder="Select unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Cost Price" type="number" step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: parseFloat(e.target.value) || 0 })} />
            <Input label="Selling Price" type="number" step="0.01" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Current Stock" type="number" step="0.01" value={form.stock} onChange={(e) => setForm({ ...form, stock: parseFloat(e.target.value) || 0 })} />
            <Input label="Min Stock Level" type="number" step="0.01" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Max Stock Level" type="number" step="0.01" value={form.maxStock} onChange={(e) => setForm({ ...form, maxStock: parseFloat(e.target.value) || 0 })} />
            <Input label="Barcode" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="e.g. 123456789012" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Location / Warehouse" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Warehouse A, Rack 12" />
            <Select label="Branch" options={[{ value: '', label: '— No Branch —' }, ...branches.map(b => ({ value: b.id, label: b.name }))]} value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingProduct(null); }}>Cancel</Button>
          <Button onClick={handleSave}>{editingProduct ? 'Update' : 'Create'}</Button>
        </DialogFooter>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onClose={() => setHistoryDialogOpen(false)} title={`History: ${historyProductName}`} size="lg">
        {historyData.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">No history records found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Field</TableHead>
                <TableHead>Old Value</TableHead>
                <TableHead>New Value</TableHead>
                <TableHead>User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyData.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell><Badge variant={r.action === 'update' ? 'default' : r.action === 'archive' ? 'warning' : 'secondary'}>{r.action}</Badge></TableCell>
                  <TableCell className="text-xs font-medium">{r.field}</TableCell>
                  <TableCell className="text-xs text-slate-500 max-w-[120px] truncate">{r.oldValue || '—'}</TableCell>
                  <TableCell className="text-xs max-w-[120px] truncate font-medium">{r.newValue || '—'}</TableCell>
                  <TableCell className="text-xs">{r.userName || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <DialogFooter><Button variant="outline" onClick={() => setHistoryDialogOpen(false)}>Close</Button></DialogFooter>
      </Dialog>

      {/* Branch Stock Dialog */}
      <Dialog open={branchStockDialogOpen} onClose={() => setBranchStockDialogOpen(false)} title={`Stock by Branch: ${branchStockProductName}`} size="md">
        {branchStockData.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">No branch stock data found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch/Warehouse</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Batch</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branchStockData.map((s, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{s.warehouseName}</TableCell>
                  <TableCell className="text-right font-mono">{s.quantity}</TableCell>
                  <TableCell className="text-xs text-slate-500">{s.location || '—'}</TableCell>
                  <TableCell className="text-xs">{s.batchNo || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <DialogFooter><Button variant="outline" onClick={() => setBranchStockDialogOpen(false)}>Close</Button></DialogFooter>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onClose={() => { setImportDialogOpen(false); setImportResults(null); }} title="Import Products" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Upload an .xlsx file with product data. <button onClick={downloadTemplate} className="text-mine-blue-800 underline hover:text-mine-blue-600">Download template</button> for the required format.</p>
          <label className="block">
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-mine-blue-400 cursor-pointer">
              {selectedFile ? (
                <div className="space-y-1"><Upload className="h-8 w-8 text-mine-blue-800 mx-auto" /><p className="text-sm font-medium text-slate-700">{selectedFile.name}</p><p className="text-xs text-slate-400">{(selectedFile.size / 1024).toFixed(0)} KB</p></div>
              ) : (
                <div className="space-y-1"><Upload className="h-8 w-8 text-slate-400 mx-auto" /><p className="text-sm text-slate-500">Click to select an .xlsx file</p><p className="text-xs text-slate-400">or drag and drop</p></div>
              )}
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
            </div>
          </label>
          {importResults && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Import Results</h4>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {importResults.map((r, i) => (
                  <div key={i} className={`text-xs px-3 py-1.5 rounded flex items-center gap-2 ${r.status === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    <span className="font-mono text-slate-400">Row {r.row}</span>
                    <span className="font-medium">{r.status === 'success' ? `${r.product?.code} — ${r.product?.name}` : r.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setImportDialogOpen(false); setImportResults(null); setSelectedFile(null); }}>Close</Button>
          <Button onClick={handleImport} loading={importing} disabled={!selectedFile}><Upload className="h-4 w-4 mr-2" />Import</Button>
        </DialogFooter>
      </Dialog>

      {/* Single Price Adjust Dialog */}
      <Dialog open={priceAdjustDialogOpen} onClose={() => setPriceAdjustDialogOpen(false)} title={`Adjust Price: ${priceAdjustProduct?.name}`} size="md">
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-sm text-slate-500">Current Prices</div>
            <div className="mt-1 flex gap-4">
              <div><span className="text-xs text-slate-400">Cost Price</span><p className="font-mono font-bold text-slate-900">${Number(priceAdjustProduct?.costPrice || 0).toFixed(2)}</p></div>
              <div><span className="text-xs text-slate-400">Selling Price</span><p className="font-mono font-bold text-slate-900">${Number(priceAdjustProduct?.sellingPrice || 0).toFixed(2)}</p></div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Price Type</label>
            <div className="flex gap-2">
              <button onClick={() => { setPriceAdjustType('selling_price'); setPriceAdjustNewPrice(String(priceAdjustProduct?.sellingPrice || 0)); }} className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${priceAdjustType === 'selling_price' ? 'bg-mine-blue-800 text-white border-mine-blue-800' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>Selling Price</button>
              <button onClick={() => { setPriceAdjustType('cost_price'); setPriceAdjustNewPrice(String(priceAdjustProduct?.costPrice || 0)); }} className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${priceAdjustType === 'cost_price' ? 'bg-mine-blue-800 text-white border-mine-blue-800' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>Cost Price</button>
            </div>
          </div>
          <Input label="New Price" type="number" step="0.01" min="0" value={priceAdjustNewPrice} onChange={(e) => setPriceAdjustNewPrice(e.target.value)} />
          {priceAdjustProduct && (
            <div className="text-sm text-slate-500">
              Change: <span className={`font-medium ${parseFloat(priceAdjustNewPrice) > Number(priceAdjustType === 'cost_price' ? priceAdjustProduct.costPrice : priceAdjustProduct.sellingPrice) ? 'text-emerald-600' : 'text-red-600'}`}>
                {parseFloat(priceAdjustNewPrice) > Number(priceAdjustType === 'cost_price' ? priceAdjustProduct.costPrice : priceAdjustProduct.sellingPrice) ? '+' : ''}
                ${(parseFloat(priceAdjustNewPrice) - Number(priceAdjustType === 'cost_price' ? priceAdjustProduct.costPrice : priceAdjustProduct.sellingPrice)).toFixed(2)}
                ({(((parseFloat(priceAdjustNewPrice) - Number(priceAdjustType === 'cost_price' ? priceAdjustProduct.costPrice : priceAdjustProduct.sellingPrice)) / Number(priceAdjustType === 'cost_price' ? priceAdjustProduct.costPrice : priceAdjustProduct.sellingPrice || 1)) * 100).toFixed(1)}%)
              </span>
            </div>
          )}
          <Input label="Reason (Optional)" value={priceAdjustReason} onChange={(e) => setPriceAdjustReason(e.target.value)} placeholder="e.g. Supplier price increase" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setPriceAdjustDialogOpen(false)}>Cancel</Button>
          <Button onClick={handlePriceAdjust} loading={priceAdjustLoading}><DollarSign className="h-4 w-4 mr-2" />Apply</Button>
        </DialogFooter>
      </Dialog>

      {/* Bulk Price Adjust Dialog */}
      <Dialog open={bulkAdjustDialogOpen} onClose={() => setBulkAdjustDialogOpen(false)} title="Bulk Price Adjustment" size="2xl">
        {bulkAdjustStep === 'configure' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Price Type</label>
              <div className="flex gap-2">
                <button onClick={() => setBulkAdjustType('selling_price')} className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${bulkAdjustType === 'selling_price' ? 'bg-mine-blue-800 text-white border-mine-blue-800' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>Selling Price</button>
                <button onClick={() => setBulkAdjustType('cost_price')} className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${bulkAdjustType === 'cost_price' ? 'bg-mine-blue-800 text-white border-mine-blue-800' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>Cost Price</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Adjustment Type</label>
              <div className="flex gap-2">
                <button onClick={() => setBulkAdjustMode('percentage')} className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${bulkAdjustMode === 'percentage' ? 'bg-mine-blue-800 text-white border-mine-blue-800' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}><Percent className="h-4 w-4 inline mr-1" />Percentage (%)</button>
                <button onClick={() => setBulkAdjustMode('fixed')} className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${bulkAdjustMode === 'fixed' ? 'bg-mine-blue-800 text-white border-mine-blue-800' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}><DollarSign className="h-4 w-4 inline mr-1" />Fixed Amount ($)</button>
              </div>
            </div>
            <Input label={bulkAdjustMode === 'percentage' ? 'Adjustment Percentage' : 'Adjustment Amount ($)'} type="number" step="0.01" value={bulkAdjustValue} onChange={(e) => setBulkAdjustValue(e.target.value)} placeholder={bulkAdjustMode === 'percentage' ? 'e.g. 10 for +10%, -5 for -5%' : 'e.g. 5.00 or -2.50'} />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Filter by Category (Optional)</label>
              <select value={bulkAdjustCategory} onChange={(e) => setBulkAdjustCategory(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 bg-white">
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <Input label="Reason (Optional)" value={bulkAdjustReason} onChange={(e) => setBulkAdjustReason(e.target.value)} placeholder="e.g. Annual price review" />
          </div>
        )}
        {bulkAdjustStep === 'preview' && bulkAdjustPreview && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              Preview: {bulkAdjustPreview.length} product{bulkAdjustPreview.length !== 1 ? 's' : ''} will be updated. Review changes below.
            </div>
            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Old Price</TableHead>
                    <TableHead className="text-right">New Price</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bulkAdjustPreview.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.code}</TableCell>
                      <TableCell className="text-sm">{p.name}</TableCell>
                      <TableCell className="text-right font-mono text-sm">${p.oldPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-medium">${p.newPrice.toFixed(2)}</TableCell>
                      <TableCell className={`text-right font-mono text-sm font-medium ${p.change > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {p.change > 0 ? '+' : ''}{p.change.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
        {bulkAdjustStep === 'result' && bulkAdjustResult && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
              Successfully updated {bulkAdjustResult.updated || bulkAdjustResult.results?.length || 0} product{((bulkAdjustResult.updated || bulkAdjustResult.results?.length || 0) !== 1) ? 's' : ''}!
            </div>
            {bulkAdjustResult.results && (
              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Old Price</TableHead>
                      <TableHead className="text-right">New Price</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkAdjustResult.results.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.code}</TableCell>
                        <TableCell className="text-sm">{r.name}</TableCell>
                        <TableCell className="text-right font-mono text-sm">${Number(r.oldPrice).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-medium">${Number(r.newPrice).toFixed(2)}</TableCell>
                        <TableCell className={`text-right font-mono text-sm font-medium ${Number(r.changeAmount) > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {Number(r.changeAmount) > 0 ? '+' : ''}{Number(r.changeAmount).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          {bulkAdjustStep === 'configure' && (
            <>
              <Button variant="outline" onClick={() => setBulkAdjustDialogOpen(false)}>Cancel</Button>
              <Button onClick={fetchBulkPreview} loading={bulkAdjustLoading}><TrendingUp className="h-4 w-4 mr-2" />Preview Changes</Button>
            </>
          )}
          {bulkAdjustStep === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setBulkAdjustStep('configure')}>Back</Button>
              <Button onClick={handleBulkAdjust} loading={bulkAdjustLoading}><DollarSign className="h-4 w-4 mr-2" />Apply {bulkAdjustPreview?.length} Changes</Button>
            </>
          )}
          {bulkAdjustStep === 'result' && (
            <Button onClick={() => setBulkAdjustDialogOpen(false)}>Done</Button>
          )}
        </DialogFooter>
      </Dialog>

      {/* Price History Dialog */}
      <Dialog open={priceHistoryDialogOpen} onClose={() => setPriceHistoryDialogOpen(false)} title={`Price History: ${priceHistoryProductName}`} size="2xl">
        {priceHistoryLoading ? (
          <p className="text-sm text-slate-500 py-4">Loading...</p>
        ) : priceHistoryData.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">No price adjustment history found.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Old Price</TableHead>
                  <TableHead className="text-right">New Price</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priceHistoryData.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{new Date(r.createdAt).toLocaleDateString()} {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                    <TableCell className="text-xs"><span className="font-mono text-slate-400">{r.productCode}</span> {r.productName}</TableCell>
                    <TableCell><Badge variant={r.priceType === 'selling_price' ? 'success' : 'default'}>{r.priceType === 'selling_price' ? 'Selling' : 'Cost'}</Badge></TableCell>
                    <TableCell className="text-right font-mono text-xs">${Number(r.oldPrice).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-medium">${Number(r.newPrice).toFixed(2)}</TableCell>
                    <TableCell className={`text-right font-mono text-xs font-medium ${Number(r.changeAmount) > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {Number(r.changeAmount) > 0 ? '+' : ''}{Number(r.changeAmount).toFixed(2)}
                      {r.changePercent ? <span className="text-slate-400 ml-1">({Number(r.changePercent).toFixed(1)}%)</span> : null}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 max-w-[120px] truncate">{r.reason || '—'}</TableCell>
                    <TableCell className="text-xs">{r.userName || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <DialogFooter><Button variant="outline" onClick={() => setPriceHistoryDialogOpen(false)}>Close</Button></DialogFooter>
      </Dialog>

    </div>
  );
}

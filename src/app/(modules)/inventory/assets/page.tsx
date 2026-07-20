'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/lib/use-toast';
import { Loader2, Plus, Edit, Trash2, Eye } from 'lucide-react';

interface Asset {
  id: string;
  assetNo: string;
  categoryId: string;
  category: { id: string; name: string };
  name: string;
  description?: string;
  model?: string;
  serialNo?: string;
  manufacturer?: string;
  location?: string;
  purchaseDate: string;
  purchaseCost: number;
  salvageValue?: number;
  status: string;
  assetCondition?: string;
  assignedTo?: string;
  custodian?: string;
  warrantyExpiry?: string;
  depreciationMethod?: string;
  usefulLifeYears?: number;
}

export default function AssetsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);

  const [showDialog, setShowDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [formData, setFormData] = useState({
    categoryId: '',
    name: '',
    description: '',
    model: '',
    serialNo: '',
    manufacturer: '',
    location: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchaseCost: '',
    salvageValue: '',
    status: 'operational',
    assetCondition: 'good',
    assignedTo: '',
    custodian: '',
    warrantyExpiry: '',
    depreciationMethod: 'straight_line',
    usefulLifeYears: '',
  });

  const [categoryFormData, setCategoryFormData] = useState({
    code: '',
    name: '',
    description: '',
    depreciation: 'straight_line',
    usefulLife: '',
    salvageRate: '',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/inventory/assets/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  // Fetch assets
  useEffect(() => {
    fetchAssets();
  }, [page, search, status]);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const res = await fetch(`/api/inventory/assets?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAssets(data.items);
        setTotal(data.total);
      } else {
        const data = await res.json().catch(() => ({}));
        toast(data.error || 'Failed to fetch assets', 'error');
      }
    } catch (error) {
      toast('Failed to fetch assets', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/inventory/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast('Asset created successfully', 'success');
        setShowDialog(false);
        setFormData({
          categoryId: '',
          name: '',
          description: '',
          model: '',
          serialNo: '',
          manufacturer: '',
          location: '',
          purchaseDate: new Date().toISOString().split('T')[0],
          purchaseCost: '',
          salvageValue: '',
          status: 'operational',
          assetCondition: 'good',
          assignedTo: '',
          custodian: '',
          warrantyExpiry: '',
          depreciationMethod: 'straight_line',
          usefulLifeYears: '',
        });
        fetchAssets();
      } else {
        const data = await res.json().catch(() => ({}));
        toast(data.error || 'Failed to create asset', 'error');
      }
    } catch (error) {
      toast('Failed to create asset', 'error');
    }
  };

  const handleUpdate = async () => {
    if (!selectedAsset) return;

    try {
      const res = await fetch(`/api/inventory/assets/${selectedAsset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast('Asset updated successfully', 'success');
        setShowDialog(false);
        setSelectedAsset(null);
        fetchAssets();
      } else {
        const data = await res.json().catch(() => ({}));
        toast(data.error || 'Failed to update asset', 'error');
      }
    } catch (error) {
      toast('Failed to update asset', 'error');
    }
  };

  const handleDelete = async (asset: Asset) => {
    const ok = await confirmDialog({
      title: 'Delete Asset',
      message: 'Are you sure you want to delete this asset? This action cannot be undone.',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/inventory/assets/${asset.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast('Asset deleted successfully', 'success');
        fetchAssets();
      } else {
        const data = await res.json().catch(() => ({}));
        toast(data.error || 'Failed to delete asset', 'error');
      }
    } catch (error) {
      toast('Failed to delete asset', 'error');
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryFormData.code || !categoryFormData.name) {
      toast('Category code and name are required', 'error');
      return;
    }

    try {
      const res = await fetch('/api/inventory/assets/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryFormData),
      });

      const data = await res.json();

      if (res.ok) {
        toast('Category created successfully', 'success');
        setShowCategoryDialog(false);
        setCategoryFormData({
          code: '',
          name: '',
          description: '',
          depreciation: 'straight_line',
          usefulLife: '',
          salvageRate: '',
        });
        
        // Refresh categories list
        const catRes = await fetch('/api/inventory/assets/categories');
        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData);
          // Set selection to the new category
          setFormData((prev) => ({ ...prev, categoryId: data.id }));
        }
      } else {
        toast(data.error || 'Failed to create category', 'error');
      }
    } catch (error) {
      toast('Failed to create category', 'error');
    }
  };

  const openEditDialog = (asset: Asset) => {
    setSelectedAsset(asset);
    setFormData({
      categoryId: asset.categoryId || asset.category?.id || '',
      name: asset.name,
      description: asset.description || '',
      model: asset.model || '',
      serialNo: asset.serialNo || '',
      manufacturer: asset.manufacturer || '',
      location: asset.location || '',
      purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().split('T')[0] : '',
      purchaseCost: asset.purchaseCost ? asset.purchaseCost.toString() : '',
      salvageValue: asset.salvageValue ? asset.salvageValue.toString() : '',
      status: asset.status,
      assetCondition: asset.assetCondition || 'good',
      assignedTo: asset.assignedTo || '',
      custodian: asset.custodian || '',
      warrantyExpiry: asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toISOString().split('T')[0] : '',
      depreciationMethod: asset.depreciationMethod || 'straight_line',
      usefulLifeYears: asset.usefulLifeYears ? asset.usefulLifeYears.toString() : '',
    });
    setShowDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      operational: 'default',
      maintenance: 'secondary',
      disposed: 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Assets</h1>
        <Button onClick={() => {
          setSelectedAsset(null);
          setFormData({
            categoryId: categories[0]?.id || '',
            name: '',
            description: '',
            model: '',
            serialNo: '',
            manufacturer: '',
            location: '',
            purchaseDate: new Date().toISOString().split('T')[0],
            purchaseCost: '',
            salvageValue: '',
            status: 'operational',
            assetCondition: 'good',
            assignedTo: '',
            custodian: '',
            warrantyExpiry: '',
            depreciationMethod: 'straight_line',
            usefulLifeYears: '',
          });
          setShowDialog(true);
        }}>
          <Plus className="w-4 h-4 mr-2" /> New Asset
        </Button>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Search assets..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border rounded"
        >
          <option value="">All Status</option>
          <option value="operational">Operational</option>
          <option value="maintenance">Maintenance</option>
          <option value="disposed">Disposed</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset No</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No assets found
                  </TableCell>
                </TableRow>
              ) : (
                assets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-mono">{asset.assetNo}</TableCell>
                    <TableCell>{asset.name}</TableCell>
                    <TableCell>{asset.category?.name}</TableCell>
                    <TableCell>{asset.location || '-'}</TableCell>
                    <TableCell>{getStatusBadge(asset.status)}</TableCell>
                    <TableCell>{asset.assignedTo || '-'}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(`/assets/${asset.id}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditDialog(asset)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(asset)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-gray-600">
              Showing {assets.length > 0 ? (page - 1) * limit + 1 : 0}-
              {Math.min(page * limit, total)} of {total} assets
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                onClick={() => setPage(page + 1)}
                disabled={page * limit >= total}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        title={selectedAsset ? 'Edit Asset' : 'New Asset'}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1 py-1">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Asset Name *</label>
            <Input
              placeholder="Asset Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Category *</label>
            <div className="flex gap-2">
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="flex-1 h-10 px-3 border rounded-md text-sm bg-white"
                required
              >
                <option value="" disabled>Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCategoryDialog(true)}
                className="px-3"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Model</label>
            <Input
              placeholder="Model / Spec"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Serial Number</label>
            <Input
              placeholder="S/N"
              value={formData.serialNo}
              onChange={(e) => setFormData({ ...formData, serialNo: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Manufacturer</label>
            <Input
              placeholder="Manufacturer"
              value={formData.manufacturer}
              onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Location</label>
            <Input
              placeholder="Location / Warehouse"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Purchase Date *</label>
            <Input
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Purchase Cost ($) *</label>
            <Input
              type="number"
              placeholder="Cost"
              value={formData.purchaseCost}
              onChange={(e) => setFormData({ ...formData, purchaseCost: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Salvage Value ($)</label>
            <Input
              type="number"
              placeholder="Salvage Value"
              value={formData.salvageValue}
              onChange={(e) => setFormData({ ...formData, salvageValue: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full h-10 px-3 border rounded-md text-sm bg-white"
            >
              <option value="operational">Operational</option>
              <option value="maintenance">Maintenance</option>
              <option value="disposed">Disposed</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Condition</label>
            <select
              value={formData.assetCondition}
              onChange={(e) => setFormData({ ...formData, assetCondition: e.target.value })}
              className="w-full h-10 px-3 border rounded-md text-sm bg-white"
            >
              <option value="new">New</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
              <option value="damaged">Damaged</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Assigned To</label>
            <Input
              placeholder="Employee/User ID"
              value={formData.assignedTo}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Custodian</label>
            <Input
              placeholder="Custodian Name"
              value={formData.custodian}
              onChange={(e) => setFormData({ ...formData, custodian: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Warranty Expiry</label>
            <Input
              type="date"
              value={formData.warrantyExpiry}
              onChange={(e) => setFormData({ ...formData, warrantyExpiry: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Depreciation Method</label>
            <select
              value={formData.depreciationMethod}
              onChange={(e) => setFormData({ ...formData, depreciationMethod: e.target.value })}
              className="w-full h-10 px-3 border rounded-md text-sm bg-white"
            >
              <option value="straight_line">Straight Line</option>
              <option value="double_declining">Double Declining Balance</option>
              <option value="units_of_production">Units of Production</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Useful Life (Years)</label>
            <Input
              type="number"
              placeholder="Years"
              value={formData.usefulLifeYears}
              onChange={(e) => setFormData({ ...formData, usefulLifeYears: e.target.value })}
            />
          </div>

          <div className="col-span-2 space-y-1">
            <label className="text-xs font-semibold text-slate-600">Description</label>
            <Input
              placeholder="Asset description/notes..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowDialog(false)}>
            Cancel
          </Button>
          <Button onClick={selectedAsset ? handleUpdate : handleCreate}>
            {selectedAsset ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Category Creation Dialog */}
      <Dialog
        open={showCategoryDialog}
        onClose={() => setShowCategoryDialog(false)}
        title="New Category"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Category Code *</label>
            <Input
              placeholder="e.g. COMP, MACH"
              value={categoryFormData.code}
              onChange={(e) => setCategoryFormData({ ...categoryFormData, code: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Category Name *</label>
            <Input
              placeholder="Category Name"
              value={categoryFormData.name}
              onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Description</label>
            <Input
              placeholder="Description"
              value={categoryFormData.description}
              onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Depreciation Method</label>
            <select
              value={categoryFormData.depreciation}
              onChange={(e) => setCategoryFormData({ ...categoryFormData, depreciation: e.target.value })}
              className="w-full h-10 px-3 border rounded-md text-sm bg-white"
            >
              <option value="straight_line">Straight Line</option>
              <option value="double_declining">Double Declining Balance</option>
              <option value="units_of_production">Units of Production</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Useful Life (Years)</label>
              <Input
                type="number"
                placeholder="Useful Life"
                value={categoryFormData.usefulLife}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, usefulLife: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Salvage Rate (%)</label>
              <Input
                type="number"
                placeholder="Rate"
                value={categoryFormData.salvageRate}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, salvageRate: e.target.value })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateCategory}>
            Create Category
          </Button>
        </DialogFooter>
      </Dialog>

    </div>
  );
}

'use client';

import { toast, dismissToast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Package, Plus, Edit2, Trash2, FolderTree } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  parentId: string | null;
}

const emptyForm = { name: '', parentId: '' };

export default function CategoriesPage() {
  const [data, setData] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/inventory/categories');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch categories', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditingCategory(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditingCategory(category);
    setForm({ name: category.name, parentId: category.parentId || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      toast('Category name is required', 'warning');
      return;
    }
    try {
      let res;
      let tid;
      if (editingCategory) {
        tid = toast('Updating category...', 'info', 120000);
        try {
          res = await fetch(`/api/inventory/categories/${editingCategory.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: form.name, parentId: form.parentId || null }),
          });
        } catch (e) { dismissToast(tid); throw e; }
      } else {
        tid = toast('Saving category...', 'info', 120000);
        try {
          res = await fetch('/api/inventory/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: form.name, parentId: form.parentId || null }),
          });
        } catch (e) { dismissToast(tid); throw e; }
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to save category', 'error');
        return;
      }
      dismissToast(tid);
      toast((editingCategory ? 'Category updated' : 'Category created') + ' successfully', 'success');
      setDialogOpen(false);
      setEditingCategory(null);
      setForm(emptyForm);
      fetchData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const category = data.find((c) => c.id === id);
    const hasChildren = data.some((c) => c.parentId === id);
    if (hasChildren) {
      toast('Cannot delete a category with sub-categories. Remove children first.', 'warning');
      return;
    }
    const ok = await confirmDialog({
      title: 'Delete Category',
      message: `Delete category "${category?.name}"?`,
      variant: 'danger',
    });
    if (!ok) return;
    try {
      const tid = toast('Deleting category...', 'info', 120000);
      let res;
      try {
        res = await fetch(`/api/inventory/categories/${id}`, { method: 'DELETE' });
      } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Delete failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to delete category', 'error');
        return;
      }
      dismissToast(tid);
      toast('Category deleted successfully', 'success');
      fetchData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  const rootCategories = data.filter((c) => !c.parentId);

  const getChildren = (parentId: string) => data.filter((c) => c.parentId === parentId);

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Product Categories</h2>
          <p className="text-slate-500 mt-1">Manage product categorization hierarchy</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FolderTree className="h-5 w-5 text-mine-blue-800" />
            Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Sub-Categories</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rootCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-slate-400 py-4">No categories yet</TableCell>
                </TableRow>
              ) : (
                rootCategories.map((cat) => {
                  const children = getChildren(cat.id);
                  return (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-slate-400" />
                          {cat.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {children.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {children.map((child) => (
                              <span key={child.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs">
                                {child.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(cat)} className="p-1.5 hover:bg-slate-100 rounded"><Edit2 className="h-4 w-4 text-slate-400" /></button>
                          <button onClick={() => handleDelete(cat.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-red-400" /></button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
              {data.filter((c) => c.parentId).length > 0 && rootCategories.length > 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="bg-slate-50 text-xs text-slate-400 py-2">
                    Child categories are shown inline under their parent
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingCategory(null); }}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Category Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Mining Equipment"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingCategory(null); }}>Cancel</Button>
          <Button onClick={handleSave}>{editingCategory ? 'Update' : 'Create'}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

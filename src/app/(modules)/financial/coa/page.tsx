'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CoaTree } from '@/components/financial/coa-tree';
import { Search, Plus, BookOpen, Filter } from 'lucide-react';

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  category: string | null;
  isHeader: boolean;
  parentId: string | null;
  balance: number;
  isActive: boolean;
  children?: Account[];
}

const emptyForm = { code: '', name: '', type: '', category: '', isHeader: false, isActive: true };

export default function CoaPage() {
  const [data, setData] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [parentId, setParentId] = useState<string | undefined>();
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (typeFilter) params.set('type', typeFilter);
      const res = await fetch(`/api/financial/coa?${params}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch accounts', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search, typeFilter]);

  const handleAdd = (parentId?: string) => {
    setParentId(parentId);
    setEditingAccount(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setParentId(undefined);
    setForm({ code: account.code, name: account.name, type: account.type, category: account.category || '', isHeader: account.isHeader, isActive: account.isActive });
    setDialogOpen(true);
  };

  const handleDelete = async (account: Account) => {
    if (!confirm(`Delete account "${account.name}" (${account.code})? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/financial/coa/${account.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Delete failed' }));
        alert(err.error || 'Failed to delete account');
        return;
      }
      fetchData();
    } catch (e) {
      alert('Network error. Please try again.');
    }
  };

  const handleSave = async () => {
    if (!form.code || !form.name || !form.type) {
      alert('Code, name, and type are required');
      return;
    }
    try {
      const payload = { ...form, parentId };
      let res;
      if (editingAccount) {
        res = await fetch(`/api/financial/coa/${editingAccount.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/financial/coa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        alert(err.error || 'Failed to save account');
        return;
      }
      setDialogOpen(false);
      setEditingAccount(null);
      setParentId(undefined);
      fetchData();
    } catch (e) {
      alert('Network error. Please try again.');
    }
  };

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Chart of Accounts</h2>
          <p className="text-slate-500 mt-1">Manage your accounting chart of accounts</p>
        </div>
        <Button onClick={() => handleAdd()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-mine-blue-800" />
              Accounts
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search accounts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-64"
                />
              </div>
              <Select
                options={[
                  { value: '', label: 'All Types' },
                  { value: 'asset', label: 'Assets' },
                  { value: 'liability', label: 'Liabilities' },
                  { value: 'equity', label: 'Equity' },
                  { value: 'revenue', label: 'Revenue' },
                  { value: 'expense', label: 'Expenses' },
                ]}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CoaTree
            accounts={data}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingAccount(null); }}
        title={editingAccount ? 'Edit Account' : 'Add Account'}
        description={editingAccount ? 'Update account details' : 'Create a new account in the chart'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Account Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. 1103" />
            <Input label="Account Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Cash on Hand" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Account Type"
              options={[
                { value: 'asset', label: 'Asset' },
                { value: 'liability', label: 'Liability' },
                { value: 'equity', label: 'Equity' },
                { value: 'revenue', label: 'Revenue' },
                { value: 'expense', label: 'Expense' },
              ]}
              placeholder="Select type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            />
            <Select
              label="Category"
              options={[
                { value: '', label: 'None' },
                { value: 'current_asset', label: 'Current Asset' },
                { value: 'fixed_asset', label: 'Fixed Asset' },
                { value: 'current_liability', label: 'Current Liability' },
                { value: 'long_term_liability', label: 'Long-term Liability' },
                { value: 'capital', label: 'Capital' },
                { value: 'retained_earnings', label: 'Retained Earnings' },
                { value: 'operating_revenue', label: 'Operating Revenue' },
                { value: 'operating_expense', label: 'Operating Expense' },
              ]}
              placeholder="Select category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.isHeader} onChange={(e) => setForm({ ...form, isHeader: e.target.checked })} className="rounded border-slate-300" />
              <span className="text-sm text-slate-700">Is Header (Group)</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded border-slate-300" />
              <span className="text-sm text-slate-700">Active</span>
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingAccount(null); }}>Cancel</Button>
          <Button onClick={handleSave}>{editingAccount ? 'Update' : 'Create'}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

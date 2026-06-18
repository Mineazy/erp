'use client';

import { toast, dismissToast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Users, Plus, Search, Edit2, Trash2, Phone, Mail, MapPin } from 'lucide-react';

interface Customer {
  id: string;
  code: string;
  name: string;
  type: string;
  contactPerson: string;
  email: string;
  phone: string;
  city: string;
  balance: number;
  isActive: boolean;
}

const emptyForm = { code: '', name: '', type: 'company', contactPerson: '', email: '', phone: '', city: '', taxId: '' };

export default function CustomersPage() {
  const [data, setData] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/crm/customers?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch customers', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search]);

  const openCreate = () => {
    setEditingCustomer(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setForm({ code: customer.code, name: customer.name, type: customer.type, contactPerson: customer.contactPerson, email: customer.email, phone: customer.phone, city: customer.city, taxId: (customer as any).taxId || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      let res;
      let tid;
      if (editingCustomer) {
        tid = toast('Updating customer...', 'info', 120000);
        try {
          res = await fetch(`/api/crm/customers/${editingCustomer.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });
        } catch (e) { dismissToast(tid); throw e; }
      } else {
        tid = toast('Saving customer...', 'info', 120000);
        try {
          res = await fetch('/api/crm/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });
        } catch (e) { dismissToast(tid); throw e; }
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to save customer', 'error');
        return;
      }
      dismissToast(tid);
      toast((editingCustomer ? 'Customer updated' : 'Customer created') + ' successfully', 'success');
      setDialogOpen(false);
      setEditingCustomer(null);
      fetchData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({ title: 'Delete Customer', message: 'Are you sure you want to delete this customer?', variant: 'danger' }); if (!ok) return;
    try {
      const tid = toast('Deleting customer...', 'info', 120000);
      let res;
      try {
        res = await fetch(`/api/crm/customers/${id}`, { method: 'DELETE' });
      } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Delete failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to delete customer', 'error');
        return;
      }
      dismissToast(tid);
      toast('Customer deleted successfully', 'success');
      fetchData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Customers</h2>
          <p className="text-slate-500 mt-1">Manage your customer relationships</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Total Customers</p>
            <p className="text-xl font-bold text-slate-900">{data.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Active</p>
            <p className="text-xl font-bold text-green-600">{data.filter(c => c.isActive).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Outstanding Balance</p>
            <p className="text-xl font-bold text-red-600">${data.reduce((s, c) => s + c.balance, 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Companies</p>
            <p className="text-xl font-bold text-mine-blue-800">{data.filter(c => c.type === 'company').length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-mine-blue-800" />
              Customer List
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email / Phone</TableHead>
                <TableHead>City</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((customer) => (
                <TableRow key={customer.id} className={!customer.isActive ? 'opacity-60' : ''}>
                  <TableCell className="font-mono text-xs">{customer.code}</TableCell>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell className="text-xs text-slate-600">{customer.contactPerson}</TableCell>
                  <TableCell>
                    <div className="flex flex-col text-xs">
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{customer.email}</span>
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{customer.phone}</span>
                    </div>
                  </TableCell>
                  <TableCell>{customer.city}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">${customer.balance.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={customer.isActive ? 'success' : 'secondary'}>
                      {customer.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(customer)} className="p-1.5 hover:bg-slate-100 rounded"><Edit2 className="h-4 w-4 text-slate-400" /></button>
                      <button onClick={() => handleDelete(customer.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-red-400" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditingCustomer(null); }} title={editingCustomer ? 'Edit Customer' : 'Add Customer'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Customer Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. CUS-006" />
            <Input label="Customer Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. NewCo Ltd" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Type" options={[{ value: 'company', label: 'Company' }, { value: 'individual', label: 'Individual' }]} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
            <Input label="Contact Person" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} placeholder="Full name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@company.com" />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+263 71 234 5678" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Harare" />
            <Input label="Tax ID" value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} placeholder="e.g. 123456789" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingCustomer(null); }}>Cancel</Button>
          <Button onClick={handleSave}>{editingCustomer ? 'Update' : 'Create'}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

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
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Users, Plus, Search, Edit2, Trash2, Shield, UserCog, UserCheck, User, Key } from 'lucide-react';
import { PermissionsModal } from './permissions-modal';

interface Branch {
  id: string;
  code: string;
  name: string;
}

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  branchId: string | null;
  branch?: Branch | null;
  mfaEnabled: boolean;
  isActive: boolean;
  lastLogin: string;
  permissions?: { modules: string[]; menus: string[] };
}

const roles = [
  { value: 'admin', label: 'Admin' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'manager', label: 'Manager' },
  { value: 'user', label: 'User' },
  { value: 'purchasing_manager', label: 'Purchasing Manager' },
  { value: 'purchasing_officer', label: 'Purchasing Officer' },
  { value: 'warehouse_manager', label: 'Warehouse Manager' },
  { value: 'warehouse_supervisor', label: 'Warehouse Supervisor' },
  { value: 'warehouse_officer', label: 'Warehouse Officer' },
  { value: 'dispatch_officer', label: 'Dispatch Officer' },
  { value: 'branch_supervisor', label: 'Branch Supervisor' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'audit_manager', label: 'Audit Manager' },
  { value: 'audit_officer', label: 'Audit Officer' },
  { value: 'finance_manager', label: 'Finance Manager' },
  { value: 'finance_officer', label: 'Finance Officer' },
  { value: 'treasurer', label: 'Treasurer' },
  { value: 'it_support', label: 'IT Support' },
  { value: 'security_officer', label: 'Security Officer' },
  { value: 'sales_marketing_manager', label: 'Sales & Marketing Manager' },
  { value: 'business_development_manager', label: 'Business Development Manager' },
  { value: 'operations_manager', label: 'Operations Manager' },
];

const departments = [
  { value: '', label: '— No Department —' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Audit', label: 'Audit' },
  { value: 'Operations', label: 'Operations' },
  { value: 'IT', label: 'IT' },
  { value: 'Purchasing', label: 'Purchasing' },
  { value: 'Warehouse', label: 'Warehouse' },
  { value: 'Sales & Marketing', label: 'Sales & Marketing' },
  { value: 'Business Development', label: 'Business Development' },
  { value: 'Shop', label: 'Shop' },
];

const emptyForm = { name: '', email: '', password: '', role: 'user', department: '', branchId: '', isActive: true };

export default function UsersPage() {
  const [data, setData] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [permissionsUser, setPermissionsUser] = useState<AppUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, admin: 0, accountant: 0, manager: 0, user: 0 });

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

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json.items || []);
      setTotal(json.total || 0);
      if (json.stats) {
        setStats(json.stats);
      }
    } catch (e) {
      console.error('Failed to fetch users', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => { fetchData(); }, [page, limit]);

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (user: AppUser) => {
    setEditingUser(user);
    setForm({ name: user.name, email: user.email, password: '', role: user.role, department: user.department, branchId: user.branchId || '', isActive: user.isActive });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const body: any = { name: form.name, email: form.email, role: form.role, department: form.department, branchId: form.branchId || null, isActive: form.isActive };
      if (!editingUser && form.password) body.password = form.password;
      if (editingUser && form.password) body.password = form.password;

      let res;
      let tid;
      if (editingUser) {
        tid = toast('Updating user...', 'info', 120000);
        try {
          res = await fetch(`/api/admin/users/${editingUser.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
        } catch (e) { dismissToast(tid); throw e; }
      } else {
        tid = toast('Saving user...', 'info', 120000);
        try {
          res = await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
        } catch (e) { dismissToast(tid); throw e; }
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to save user', 'error');
        return;
      }
      dismissToast(tid);
      toast((editingUser ? 'User updated' : 'User created') + ' successfully', 'success');
      setDialogOpen(false);
      setEditingUser(null);
      fetchData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({ title: 'Delete User', message: 'Are you sure you want to delete this user?', variant: 'danger' }); if (!ok) return;
    try {
      const tid = toast('Deleting user...', 'info', 120000);
      let res;
      try {
        res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Delete failed' }));
        dismissToast(tid);
        toast(err.error || 'Failed to delete user', 'error');
        return;
      }
      dismissToast(tid);
      toast('User deleted successfully', 'success');
      fetchData();
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  const roleIcon = (role: string) => {
    const r = role.toLowerCase();
    if (r === 'admin') return <Shield className="h-4 w-4 text-red-500" />;
    if (r === 'it_support') return <Shield className="h-4 w-4 text-emerald-500" />;
    if (r.includes('manager') || r.includes('supervisor') || r === 'treasurer') {
      return <UserCheck className="h-4 w-4 text-amber-600" />;
    }
    if (r.includes('officer') || r === 'cashier' || r === 'accountant') {
      return <UserCog className="h-4 w-4 text-mine-blue-800" />;
    }
    return <User className="h-4 w-4 text-slate-400" />;
  };

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
          <p className="text-slate-500 mt-1">Manage system users and roles</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Total</p>
            <p className="text-xl font-bold text-slate-900">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Admin</p>
            <p className="text-xl font-bold text-red-600">{stats.admin}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Accountant</p>
            <p className="text-xl font-bold text-mine-blue-800">{stats.accountant}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Manager</p>
            <p className="text-xl font-bold text-amber-600">{stats.manager}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">User</p>
            <p className="text-xl font-bold text-slate-500">{stats.user}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-mine-blue-800" />
              Users
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>MFA</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((user) => (
                  <TableRow key={user.id} className={!user.isActive ? 'opacity-60' : ''}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-xs text-slate-600">{user.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {roleIcon(user.role)}
                        <span className="text-xs capitalize">
                          {roles.find(r => r.value === user.role)?.label || user.role.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{user.branch?.name || '-'}</TableCell>
                    <TableCell className="text-xs text-slate-600">{user.department || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={user.mfaEnabled ? 'success' : 'secondary'}>{user.mfaEnabled ? 'Enabled' : 'Disabled'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'success' : 'secondary'}>{user.isActive ? 'Active' : 'Inactive'}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setPermissionsUser(user)} className="p-1.5 hover:bg-slate-100 rounded" title="Manage Permissions"><Key className="h-4 w-4 text-slate-400" /></button>
                      <button onClick={() => openEdit(user)} className="p-1.5 hover:bg-slate-100 rounded" title="Edit User"><Edit2 className="h-4 w-4 text-slate-400" /></button>
                      <button onClick={() => handleDelete(user.id)} className="p-1.5 hover:bg-red-50 rounded" title="Delete User"><Trash2 className="h-4 w-4 text-red-400" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <div className="text-sm text-slate-500">
              Showing <span className="font-semibold text-slate-700">{total === 0 ? 0 : (page - 1) * limit + 1}</span> to{' '}
              <span className="font-semibold text-slate-700">
                {Math.min(page * limit, total)}
              </span>{' '}
              of <span className="font-semibold text-slate-700">{total}</span> users
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="h-8 rounded-lg"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(p + 1, Math.ceil(total / limit)))}
                disabled={page * limit >= total}
                className="h-8 rounded-lg"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditingUser(null); }} title={editingUser ? 'Edit User' : 'Add User'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@company.com" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label={editingUser ? 'New Password (leave blank to keep)' : 'Password'} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editingUser ? 'Leave blank to keep' : 'Password'} />
            <Select label="Role" options={roles} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Branch" options={[{ value: '', label: '— No Branch —' }, ...branches.map(b => ({ value: b.id, label: b.name }))]} value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} />
            <Select label="Department" options={departments} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </div>
          <Checkbox label="Active" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingUser(null); }}>Cancel</Button>
          <Button onClick={handleSave}>{editingUser ? 'Update' : 'Create'}</Button>
        </DialogFooter>
      </Dialog>

      <PermissionsModal 
        user={permissionsUser} 
        onClose={() => setPermissionsUser(null)} 
        onSave={() => { setPermissionsUser(null); fetchData(); }} 
      />
    </div>
  );
}

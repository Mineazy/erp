'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import {
  ScrollText, Search, Calendar, Shield, Building2, User,
  FileText, ArrowUpDown, X, Eye, Laptop, Terminal, CalendarRange
} from 'lucide-react';

interface AuditLogItem {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  userName: string;
  changes: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  userDepartment: string;
  userBranch: string;
  userRole: string;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

const DEPARTMENTS = ['Admin', 'Finance', 'Purchasing', 'Warehouse', 'Business Development', 'Audit', 'Operations', 'IT'];
const ROLES = ['Admin', 'User', 'Manager', 'Accountant'];
const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'];
const MODULES = [
  { value: 'Product', label: 'Products' },
  { value: 'Customer', label: 'Customers' },
  { value: 'Supplier', label: 'Suppliers' },
  { value: 'Vehicle', label: 'Vehicles' },
  { value: 'Branch', label: 'Branches' },
  { value: 'StockCount', label: 'Stock Counts' },
  { value: 'Invoice', label: 'Invoices' },
  { value: 'UserSession', label: 'User Sessions' },
  { value: 'StockMovement', label: 'Stock Movements' },
  { value: 'PurchaseOrder', label: 'Purchase Orders' },
  { value: 'JournalEntry', label: 'Journal Entries' },
  { value: 'Document', label: 'Documents' },
  { value: 'DocumentFolder', label: 'Document Folders' },
  { value: 'DocumentShare', label: 'Document Shares' }
];

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [branchId, setBranchId] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(15);

  // Details Dialog
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  // Load branches
  useEffect(() => {
    fetch('/api/admin/branches')
      .then(res => res.ok ? res.json() : [])
      .then(data => setBranches(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        branchId,
        department,
        role,
        module: moduleFilter,
        dateFrom,
        dateTo,
        page: page.toString(),
        limit: limit.toString(),
      });

      const res = await fetch(`/api/admin/audit?${params}`);
      if (!res.ok) throw new Error('Failed to fetch logs');
      
      const data = await res.json();
      setLogs(data.items || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      toast(err.message || 'Failed to load audit logs', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, branchId, department, role, moduleFilter, dateFrom, dateTo, page, limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const clearFilters = () => {
    setSearch('');
    setBranchId('');
    setDepartment('');
    setRole('');
    setModuleFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const getActionBadge = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">CREATE</Badge>;
      case 'UPDATE':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">UPDATE</Badge>;
      case 'DELETE':
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200">DELETE</Badge>;
      case 'LOGIN':
        return <Badge className="bg-teal-50 text-teal-700 border-teal-200">LOGIN</Badge>;
      case 'LOGOUT':
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200">LOGOUT</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const getDepartmentBadge = (dept: string) => {
    const colors: Record<string, string> = {
      Admin: 'bg-purple-50 text-purple-700 border-purple-200',
      Finance: 'bg-amber-50 text-amber-700 border-amber-200',
      Purchasing: 'bg-sky-50 text-sky-700 border-sky-200',
      Warehouse: 'bg-orange-50 text-orange-700 border-orange-200',
      'Business Development': 'bg-indigo-50 text-indigo-700 border-indigo-200',
      Audit: 'bg-rose-50 text-rose-700 border-rose-200',
      IT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
    return (
      <Badge className={colors[dept] || 'bg-slate-50 text-slate-700 border-slate-200'}>
        {dept}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-slate-600" />
            Audit Trail Logs
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track and audit system-wide user access, login sessions, and database CRUD operations.
          </p>
        </div>
        <Button onClick={fetchLogs} variant="outline" size="sm" className="h-9">
          Refresh Logs
        </Button>
      </div>

      {/* Filter Panel */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Search className="h-4 w-4 text-slate-400" />
            Filter and Search Logs
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Search text
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="User, action, or details..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-10 border-slate-200 rounded-lg text-sm focus-visible:ring-mine-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Department
              </label>
              <Select
                value={department}
                onChange={e => setDepartment(e.target.value)}
                options={[
                  { value: '', label: 'All Departments' },
                  ...DEPARTMENTS.map(d => ({ value: d, label: d }))
                ]}
                className="h-10 border-slate-200 rounded-lg focus-visible:ring-mine-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Branch
              </label>
              <Select
                value={branchId}
                onChange={e => setBranchId(e.target.value)}
                options={[
                  { value: '', label: 'All Branches' },
                  ...branches.map(b => ({ value: b.id, label: b.name }))
                ]}
                className="h-10 border-slate-200 rounded-lg focus-visible:ring-mine-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                System Module
              </label>
              <Select
                value={moduleFilter}
                onChange={e => setModuleFilter(e.target.value)}
                options={[
                  { value: '', label: 'All Modules' },
                  ...MODULES
                ]}
                className="h-10 border-slate-200 rounded-lg focus-visible:ring-mine-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                User Role
              </label>
              <Select
                value={role}
                onChange={e => setRole(e.target.value)}
                options={[
                  { value: '', label: 'All Roles' },
                  ...ROLES.map(r => ({ value: r, label: r }))
                ]}
                className="h-10 border-slate-200 rounded-lg focus-visible:ring-mine-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Date From
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="pl-9 h-10 border-slate-200 rounded-lg focus-visible:ring-mine-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Date To
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="pl-9 h-10 border-slate-200 rounded-lg focus-visible:ring-mine-blue-500"
                />
              </div>
            </div>

            <div className="flex items-end justify-start sm:justify-end gap-2">
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="h-10 px-4 text-slate-500 hover:text-slate-900 border border-transparent hover:border-slate-200 rounded-lg transition-all"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-semibold text-slate-700 py-3">Timestamp</TableHead>
              <TableHead className="font-semibold text-slate-700 py-3">User & ID</TableHead>
              <TableHead className="font-semibold text-slate-700 py-3">Department</TableHead>
              <TableHead className="font-semibold text-slate-700 py-3">Branch</TableHead>
              <TableHead className="font-semibold text-slate-700 py-3">Module</TableHead>
              <TableHead className="font-semibold text-slate-700 py-3">Action</TableHead>
              <TableHead className="font-semibold text-slate-700 py-3">Target ID</TableHead>
              <TableHead className="font-semibold text-slate-700 py-3 text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-mine-blue-600" />
                    <span>Loading logs...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                  No matching audit logs found.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="text-xs text-slate-500 font-mono">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-slate-900 text-sm">{log.userName}</div>
                    <div className="text-xs text-slate-500">{log.userId}</div>
                  </TableCell>
                  <TableCell>
                    {getDepartmentBadge(log.userDepartment)}
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {log.userBranch}
                  </TableCell>
                  <TableCell className="font-semibold text-slate-700 text-sm">
                    {log.entityType}
                  </TableCell>
                  <TableCell>
                    {getActionBadge(log.action)}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-slate-400 truncate max-w-[120px]">
                    {log.entityId}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedLog(log)}
                      className="text-mine-blue-600 hover:text-mine-blue-900 hover:bg-mine-blue-50/50"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <div className="text-sm text-slate-500">
              Showing <span className="font-semibold text-slate-700">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-semibold text-slate-700">
                {Math.min(page * limit, total)}
              </span>{' '}
              of <span className="font-semibold text-slate-700">{total}</span> logs
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

      {/* Details Dialog */}
      {selectedLog && (
        <Dialog
          open={true}
          title="Audit Log Detail Inspection"
          onClose={() => setSelectedLog(null)}
          size="lg"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4 border border-slate-100 text-sm">
              <div className="space-y-2">
                <div className="text-xs text-slate-400 uppercase font-semibold">User Details</div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-500" />
                  <span className="font-semibold text-slate-800">{selectedLog.userName}</span>
                </div>
                <div className="text-slate-500 font-mono text-xs pl-6">{selectedLog.userId}</div>
                <div className="pl-6 pt-1 flex gap-2">
                  {getDepartmentBadge(selectedLog.userDepartment)}
                  <Badge variant="outline">{selectedLog.userRole}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-slate-400 uppercase font-semibold">Audit Context</div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Building2 className="h-4 w-4 text-slate-500" />
                  <span>Branch: <strong className="text-slate-800">{selectedLog.userBranch}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Laptop className="h-4 w-4 text-slate-500" />
                  <span>IP Address: <strong className="text-slate-800 font-mono">{selectedLog.ipAddress || 'Unknown'}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 truncate">
                  <Terminal className="h-4 w-4 text-slate-500" />
                  <span className="truncate">Browser Agent: <span className="font-mono text-xs">{selectedLog.userAgent || 'Unknown'}</span></span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-slate-400 uppercase font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                Data Mutation & Changes
              </div>
              <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto max-h-[300px] border border-slate-950">
                <pre>{JSON.stringify(selectedLog.changes, null, 2)}</pre>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-400">
              <div className="flex items-center gap-1">
                <CalendarRange className="h-4 w-4" />
                Logged on {new Date(selectedLog.createdAt).toLocaleString()}
              </div>
              <div>ID: {selectedLog.id}</div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setSelectedLog(null)} className="rounded-lg bg-slate-900 hover:bg-slate-800">
              Close Details
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}

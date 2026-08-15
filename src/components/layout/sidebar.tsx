'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { canAccessModule } from '@/lib/authz';
import type { UserRole } from '@/lib/authz';
import {
  LayoutDashboard, BookOpen, FileText, Book, Scale, Receipt, CreditCard, Wallet,
  Package, ShoppingCart, Truck, Users, Building2, ChevronDown, ChevronRight,
  LucideIcon, Target, Percent, ClipboardList, Warehouse, ArrowLeftRight,
  ClipboardCheck, Wrench, QrCode, BarChart3, Shield, Settings, FolderTree,
  RotateCcw, MessageCircle, AlertTriangle, TrendingUp, LineChart, Bell,
  FileBarChart, ScrollText, Award, Crown, Handshake, Store, Briefcase, ListTodo, DollarSign, Clock,
} from 'lucide-react';
import { useState } from 'react';

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, BookOpen, FileText, Book, Scale, Receipt, CreditCard, Wallet,
  Package, ShoppingCart, Truck, Users, Building2, Target, Percent, ClipboardList,
  Warehouse, ArrowLeftRight, ClipboardCheck, Wrench, QrCode, BarChart3, Shield, Settings,
  RotateCcw, MessageCircle, AlertTriangle, TrendingUp, LineChart, Bell,
  FileBarChart, ScrollText, FolderTree, Award, Crown, Handshake, Store, Briefcase, ListTodo, DollarSign, Clock,
};

const navGroups = [
  {
    group: 'Main',
    module: 'main',
    theme: 'slate',
    icon: 'LayoutDashboard',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    ],
  },
  {
    group: 'Financial',
    module: 'financial',
    theme: 'emerald',
    icon: 'DollarSign',
    items: [
      { label: 'Chart of Accounts', href: '/financial/coa', icon: 'BookOpen' },
      { label: 'Journal Entries', href: '/financial/journal', icon: 'FileText' },
      { label: 'General Ledger', href: '/financial/ledger', icon: 'Book' },
      { label: 'Trial Balance', href: '/financial/trial-balance', icon: 'Scale' },
      { label: 'Accounts Receivable', href: '/financial/ar', icon: 'Receipt' },
      { label: 'Sales Journal', href: '/financial/sales-journal', icon: 'Book' },
      { label: 'Sales Ledger', href: '/financial/sales-ledger', icon: 'Receipt' },
      { label: 'Accounts Payable', href: '/financial/ap', icon: 'CreditCard' },
      { label: 'Purchases Journal', href: '/financial/purchases-journal', icon: 'FileText' },
      { label: 'Purchases Ledger', href: '/financial/purchases-ledger', icon: 'BookOpen' },
      { label: 'Cashbook', href: '/financial/cashbook', icon: 'Wallet' },
      { label: 'Income Statement', href: '/financial/income-statement', icon: 'TrendingUp' },
      { label: 'Cashflow Statement', href: '/financial/cashflow-statement', icon: 'ArrowLeftRight' },
      { label: 'Balance Sheet', href: '/financial/balance-sheet', icon: 'Scale' },
      { label: 'Statement of Changes in Equity', href: '/financial/statement-of-changes-in-equity', icon: 'LineChart' },
      { label: 'Age Analysis', href: '/financial/age-analysis', icon: 'BarChart3' },
      { label: 'Multi-Currency VAT', href: '/financial/multicurrency-vat-reporting', icon: 'Percent' },
      { label: 'Tax Engine', href: '/tax', icon: 'Percent' },
      { label: 'Reports & Analytics', href: '/financial/reports', icon: 'FileBarChart' },
    ],
  },
  {
    group: 'Sales & Marketing',
    module: 'sales',
    theme: 'orange',
    icon: 'TrendingUp',
    items: [
      { label: 'Dashboard', href: '/sales/dashboard', icon: 'LayoutDashboard' },
      { label: 'Quotations', href: '/sales/quotations', icon: 'FileText' },
    ],
  },
  {
    group: 'CRM',
    module: 'crm',
    theme: 'purple',
    icon: 'Users',
    items: [
      { label: 'Customers', href: '/crm/customers', icon: 'Users' },
      { label: 'Leads', href: '/crm/leads', icon: 'Target' },
      { label: 'Suppliers', href: '/suppliers', icon: 'Building2' },
      { label: 'Loyalty Program', href: '/crm/loyalty', icon: 'Award' },
      { label: 'Big Spenders', href: '/crm/spenders', icon: 'Crown' },
      { label: 'Resellers', href: '/crm/resellers', icon: 'Handshake' },
      { label: 'Reports & Analytics', href: '/crm/reports', icon: 'FileBarChart' },
    ],
  },
  {
    group: 'Inventory',
    module: 'inventory',
    theme: 'sky',
    icon: 'Package',
    items: [
      { label: 'Dashboard', href: '/inventory/dashboard', icon: 'LayoutDashboard' },
      { label: 'Products', href: '/inventory/products', icon: 'Package' },
      { label: 'Customer Orders', href: '/inventory/customer-orders', icon: 'ShoppingCart' },
      { label: 'Sales Management', href: '/inventory/sales-management', icon: 'BarChart3' },
      { label: 'Sales Forecasting', href: '/inventory/sales-forecasting', icon: 'TrendingUp' },
      { label: 'Inventory Overview', href: '/inventory/overview', icon: 'FolderTree' },
      { label: 'Branch Orders', href: '/inventory/branch-orders', icon: 'Store' },
      { label: 'Seasonality', href: '/inventory/seasonality', icon: 'Clock' },
      { label: 'Reports', href: '/inventory/reports', icon: 'FileBarChart' },
    ],
  },
  {
    group: 'Purchasing',
    module: 'purchasing',
    theme: 'teal',
    icon: 'ShoppingCart',
    items: [
      { label: 'Requisitions', href: '/purchasing/requisitions', icon: 'ClipboardList' },
      { label: 'Reports & Analytics', href: '/purchasing/reports', icon: 'FileBarChart' },
    ],
  },
  {
    group: 'Warehouse',
    module: 'warehouse',
    theme: 'indigo',
    icon: 'Warehouse',
    items: [
      { label: 'Dashboard', href: '/warehouse', icon: 'LayoutDashboard' },
      { label: 'Warehouses', href: '/warehouse/warehouses', icon: 'Warehouse' },
      { label: 'Locations', href: '/warehouse/branches', icon: 'Building2' },
      { label: 'Back Order Mgt', href: '/warehouse/back-orders', icon: 'AlertTriangle' },
      { label: 'Goods Receiving', href: '/inventory/goods-receipts', icon: 'ClipboardCheck' },
      { label: 'Branch Orders', href: '/warehouse/branch-orders', icon: 'Store' },
      { label: 'L99 Discrepancies', href: '/warehouse/l99-investigation', icon: 'AlertTriangle' },
      { label: 'Stock Transfers', href: '/warehouse/stock-transfers', icon: 'ArrowLeftRight' },
      { label: 'Storage Locations', href: '/warehouse/storage-locations', icon: 'Package' },
      { label: 'Cycle Counts', href: '/warehouse/cycle-counts', icon: 'ClipboardList' },
      { label: 'Reports', href: '/warehouse/reports', icon: 'FileBarChart' },
    ],
  },
  {
    group: 'POS',
    module: 'pos',
    theme: 'violet',
    icon: 'Store',
    items: [
      { label: 'POS Terminal', href: '/pos', icon: 'ShoppingCart' },
      { label: 'Sessions', href: '/pos/sessions', icon: 'Receipt' },
      { label: 'History', href: '/pos/history', icon: 'FileText' },
      { label: 'Invoice Journal', href: '/pos/journal', icon: 'Book' },
      { label: 'Z Reports (EOD)', href: '/pos/reports/z-reports', icon: 'FileText' },
      { label: 'Variances', href: '/pos/reports/variances', icon: 'AlertTriangle' },
      { label: 'Branch Orders', href: '/inventory/branch-orders', icon: 'Store' },
      { label: 'Reports & Analytics', href: '/pos/reports', icon: 'FileBarChart' },
    ],
  },
  {
    group: 'Workshop',
    module: 'workshop',
    theme: 'rose',
    icon: 'Wrench',
    items: [
      { label: 'Equipment', href: '/workshop/equipment', icon: 'Wrench' },
      { label: 'Work Orders', href: '/workshop/work-orders', icon: 'ClipboardList' },
      { label: 'Reports & Analytics', href: '/workshop/reports', icon: 'FileBarChart' },
    ],
  },
  {
    group: 'Fleet & Fuel',
    module: 'fleet',
    theme: 'cyan',
    icon: 'Truck',
    items: [
      { label: 'Vehicles & Tracking', href: '/fleet/vehicles', icon: 'Truck' },
      { label: 'Fuel Requisitions', href: '/fleet/requisitions', icon: 'ClipboardList' },
      { label: 'Prepaid Fuel', href: '/fleet/prepaid', icon: 'CreditCard' },
      { label: 'Hauling Trips', href: '/fleet/hauling', icon: 'ArrowLeftRight' },
      { label: 'Reports & Analytics', href: '/fleet/reports', icon: 'FileBarChart' },
    ],
  },
  {
    group: 'FDMS',
    module: 'fdms',
    theme: 'fuchsia',
    icon: 'QrCode',
    items: [
      { label: 'Fiscalisation', href: '/fdms', icon: 'QrCode' },
      { label: 'Reports & Analytics', href: '/fdms/reports', icon: 'FileBarChart' },
    ],
  },
  {
    group: 'Messaging',
    module: 'messaging',
    theme: 'pink',
    icon: 'MessageCircle',
    items: [
      { label: 'Messages', href: '/messaging', icon: 'MessageCircle' },
    ],
  },
  {
    group: 'Reports',
    module: 'reports',
    theme: 'amber',
    icon: 'BarChart3',
    items: [
      { label: 'Reports & Analytics', href: '/reports', icon: 'BarChart3' },
    ],
  },
  {
    group: 'Admin',
    module: 'admin',
    theme: 'red',
    icon: 'Shield',
    items: [
      { label: 'Users', href: '/admin/users', icon: 'Shield' },
      { label: 'Branches', href: '/admin/branches', icon: 'Building2' },
      { label: 'Settings', href: '/admin/settings', icon: 'Settings' },
      { label: 'Audit Trail', href: '/admin/audit', icon: 'ScrollText' },
    ],
  },
  {
    group: 'Projects',
    module: 'projects',
    theme: 'mine-blue',
    icon: 'Briefcase',
    items: [
      { label: 'Dashboard', href: '/projects/dashboard', icon: 'LayoutDashboard' },
      { label: 'All Projects', href: '/projects', icon: 'Briefcase' },
      { label: 'Reports & Analytics', href: '/projects/reports', icon: 'BarChart3' },
    ],
  },
];

type ThemeConfig = {
  groupText: string;
  groupBg: string;
  iconActive: string;
  iconInactive: string;
  bgActive: string;
  textActive: string;
};

const themeMap: Record<string, ThemeConfig> = {
  slate: { groupText: 'text-slate-600', groupBg: 'bg-slate-100/50', iconActive: 'text-slate-700', iconInactive: 'text-slate-400 group-hover:text-slate-500', bgActive: 'bg-slate-100', textActive: 'text-slate-900' },
  emerald: { groupText: 'text-emerald-600', groupBg: 'bg-emerald-50/50', iconActive: 'text-emerald-700', iconInactive: 'text-emerald-400 group-hover:text-emerald-500', bgActive: 'bg-emerald-100', textActive: 'text-emerald-900' },
  orange: { groupText: 'text-orange-600', groupBg: 'bg-orange-50/50', iconActive: 'text-orange-700', iconInactive: 'text-orange-400 group-hover:text-orange-500', bgActive: 'bg-orange-100', textActive: 'text-orange-900' },
  purple: { groupText: 'text-purple-600', groupBg: 'bg-purple-50/50', iconActive: 'text-purple-700', iconInactive: 'text-purple-400 group-hover:text-purple-500', bgActive: 'bg-purple-100', textActive: 'text-purple-900' },
  sky: { groupText: 'text-sky-600', groupBg: 'bg-sky-50/50', iconActive: 'text-sky-700', iconInactive: 'text-sky-400 group-hover:text-sky-500', bgActive: 'bg-sky-100', textActive: 'text-sky-900' },
  teal: { groupText: 'text-teal-600', groupBg: 'bg-teal-50/50', iconActive: 'text-teal-700', iconInactive: 'text-teal-400 group-hover:text-teal-500', bgActive: 'bg-teal-100', textActive: 'text-teal-900' },
  indigo: { groupText: 'text-indigo-600', groupBg: 'bg-indigo-50/50', iconActive: 'text-indigo-700', iconInactive: 'text-indigo-400 group-hover:text-indigo-500', bgActive: 'bg-indigo-100', textActive: 'text-indigo-900' },
  violet: { groupText: 'text-violet-600', groupBg: 'bg-violet-50/50', iconActive: 'text-violet-700', iconInactive: 'text-violet-400 group-hover:text-violet-500', bgActive: 'bg-violet-100', textActive: 'text-violet-900' },
  rose: { groupText: 'text-rose-600', groupBg: 'bg-rose-50/50', iconActive: 'text-rose-700', iconInactive: 'text-rose-400 group-hover:text-rose-500', bgActive: 'bg-rose-100', textActive: 'text-rose-900' },
  cyan: { groupText: 'text-cyan-600', groupBg: 'bg-cyan-50/50', iconActive: 'text-cyan-700', iconInactive: 'text-cyan-400 group-hover:text-cyan-500', bgActive: 'bg-cyan-100', textActive: 'text-cyan-900' },
  fuchsia: { groupText: 'text-fuchsia-600', groupBg: 'bg-fuchsia-50/50', iconActive: 'text-fuchsia-700', iconInactive: 'text-fuchsia-400 group-hover:text-fuchsia-500', bgActive: 'bg-fuchsia-100', textActive: 'text-fuchsia-900' },
  pink: { groupText: 'text-pink-600', groupBg: 'bg-pink-50/50', iconActive: 'text-pink-700', iconInactive: 'text-pink-400 group-hover:text-pink-500', bgActive: 'bg-pink-100', textActive: 'text-pink-900' },
  amber: { groupText: 'text-amber-600', groupBg: 'bg-amber-50/50', iconActive: 'text-amber-700', iconInactive: 'text-amber-400 group-hover:text-amber-500', bgActive: 'bg-amber-100', textActive: 'text-amber-900' },
  red: { groupText: 'text-red-600', groupBg: 'bg-red-50/50', iconActive: 'text-red-700', iconInactive: 'text-red-400 group-hover:text-red-500', bgActive: 'bg-red-100', textActive: 'text-red-900' },
  'mine-blue': { groupText: 'text-mine-blue-600', groupBg: 'bg-mine-blue-50/50', iconActive: 'text-mine-blue-700', iconInactive: 'text-mine-blue-400 group-hover:text-mine-blue-500', bgActive: 'bg-mine-blue-100', textActive: 'text-mine-blue-900' },
};

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role as UserRole | undefined;
  const department = (session?.user as { department?: string } | undefined)?.department;
  const isLoading = status === 'loading';

  const visibleGroups = isLoading || !role
    ? navGroups
    : navGroups.filter((group) => {
        if (!group.module || group.module === 'main') return true;
        return canAccessModule(group.module, role, department);
      });

  const [expandedGroups, setExpandedGroups] = useState<string[]>(
    visibleGroups.map((g) => g.group),
  );

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href);

  return (
    <>
      {!collapsed && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm md:hidden"
          onClick={onToggle}
        />
      )}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-slate-50 border-r border-slate-200 transition-all duration-300 flex flex-col',
          collapsed ? '-translate-x-full md:translate-x-0 md:w-20' : 'translate-x-0 w-[280px]'
        )}
      >
        <div className="flex items-center gap-3 px-6 h-20 border-b border-slate-200 bg-white">
          <img src="/logo.png" alt="Mineazy" className="h-20 w-20 object-contain flex-shrink-0" />
          {!collapsed && (
            <span className="font-bold tracking-tight text-slate-900 text-xl whitespace-nowrap">Mineazy ERP</span>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-4 shadow-inner">
          {visibleGroups.map((group) => {
            const isExpanded = expandedGroups.includes(group.group);
            const theme = themeMap[group.theme] || themeMap.slate;
            const GroupIcon = iconMap[group.icon];

            return (
              <div key={group.group} className="flex flex-col space-y-1">
                <button
                  onClick={() => toggleGroup(group.group)}
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors rounded-md group",
                    isExpanded ? cn(theme.groupText, theme.groupBg) : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  )}
                >
                  {!collapsed && (
                    <>
                      {GroupIcon && <GroupIcon className="h-4 w-4 mr-1.5" />}
                      <span className="flex-1 text-left">{group.group}</span>
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </>
                  )}
                  {collapsed && GroupIcon && (
                    <GroupIcon className={cn("h-5 w-5 mx-auto", isExpanded ? theme.groupText : "text-slate-400 group-hover:text-slate-600")} />
                  )}
                </button>
                {isExpanded && (
                  <div className="space-y-[2px] mt-1">
                    {group.items.map((item) => {
                      const ItemIcon = iconMap[item.icon];
                      const active = isActive(item.href);
                      return (
                         <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'group flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all',
                            active
                              ? cn(theme.bgActive, theme.textActive, 'font-semibold shadow-sm')
                              : 'text-slate-600 hover:bg-white hover:shadow-sm hover:text-slate-900'
                          )}
                          title={collapsed ? item.label : undefined}
                        >
                          {ItemIcon && (
                            <ItemIcon 
                              className={cn(
                                "h-[18px] w-[18px] flex-shrink-0 transition-colors",
                                active ? theme.iconActive : theme.iconInactive
                              )} 
                            />
                          )}
                          {!collapsed && <span>{item.label}</span>}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

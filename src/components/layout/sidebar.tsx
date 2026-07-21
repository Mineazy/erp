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
  FileBarChart, ScrollText, Award, Crown, Handshake,
} from 'lucide-react';
import { useState } from 'react';

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, BookOpen, FileText, Book, Scale, Receipt, CreditCard, Wallet,
  Package, ShoppingCart, Truck, Users, Building2, Target, Percent, ClipboardList,
  Warehouse, ArrowLeftRight, ClipboardCheck, Wrench, QrCode, BarChart3, Shield, Settings,
  RotateCcw, MessageCircle, AlertTriangle, TrendingUp, LineChart, Bell,
  FileBarChart, ScrollText, FolderTree, Award, Crown, Handshake,
};

const navGroups = [
  {
    group: 'Main',
    module: 'main',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    ],
  },
  {
    group: 'Financial',
    module: 'financial',
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
        { label: 'Multi-Currency VAT Reporting', href: '/financial/multicurrency-vat-reporting', icon: 'Percent' },
      { label: 'Tax Engine', href: '/tax', icon: 'Percent' },
      { label: 'Reports & Analytics', href: '/financial/reports', icon: 'FileBarChart' },
    ],
  },
  {
    group: 'CRM',
    module: 'crm',
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
    items: [
      { label: 'Dashboard', href: '/inventory/dashboard', icon: 'LayoutDashboard' },
      { label: 'Products', href: '/inventory/products', icon: 'Package' },
      { label: 'Assets', href: '/inventory/assets', icon: 'Package' },
      { label: 'Categories', href: '/inventory/categories', icon: 'FolderTree' },
      { label: 'Sales Orders', href: '/inventory/sales-orders', icon: 'ShoppingCart' },
      { label: 'Purchase Orders', href: '/inventory/purchase-orders', icon: 'Truck' },
      { label: 'Returns', href: '/inventory/returns', icon: 'RotateCcw' },
      { label: 'Goods Receipts', href: '/inventory/goods-receipts', icon: 'ClipboardCheck' },
      { label: 'Dispatch Notes', href: '/inventory/dispatch-notes', icon: 'FileText' },
      { label: 'Quotations', href: '/inventory/quotations', icon: 'FileText' },
      { label: 'Stock Adjustments', href: '/inventory/stock/adjustments', icon: 'AlertTriangle' },
      { label: 'Stock Transfers', href: '/inventory/stock/transfers', icon: 'ArrowLeftRight' },
      { label: 'Stock Counts', href: '/inventory/stock/counts', icon: 'ClipboardCheck' },
      { label: 'Forecasting', href: '/inventory/forecasting', icon: 'TrendingUp' },
      { label: 'Sales Prediction', href: '/inventory/sales-prediction', icon: 'LineChart' },
      { label: 'Optimization', href: '/inventory/optimization', icon: 'BarChart3' },
      { label: 'Alerts', href: '/inventory/alerts', icon: 'Bell' },
      { label: 'Reports', href: '/inventory/reports', icon: 'FileBarChart' },
      { label: 'Audit Trail', href: '/inventory/audit', icon: 'ScrollText' },
    ],
  },
  {
    group: 'Purchasing',
    module: 'purchasing',
    items: [
      { label: 'Requisitions', href: '/purchasing/requisitions', icon: 'ClipboardList' },
      { label: 'Reports & Analytics', href: '/purchasing/reports', icon: 'FileBarChart' },
    ],
  },
  {
    group: 'Warehouse',
    module: 'warehouse',
    items: [
      { label: 'Warehouses', href: '/warehouse', icon: 'Warehouse' },
      { label: 'Stock Movements', href: '/warehouse/movements', icon: 'ArrowLeftRight' },
      { label: 'Cycle Counts', href: '/warehouse/cycle-counts', icon: 'ClipboardCheck' },
      { label: 'Reports & Analytics', href: '/warehouse/reports', icon: 'FileBarChart' },
    ],
  },
  {
    group: 'POS',
    module: 'pos',
    items: [
      { label: 'POS Terminal', href: '/pos', icon: 'ShoppingCart' },
      { label: 'Sessions', href: '/pos/sessions', icon: 'Receipt' },
      { label: 'History', href: '/pos/history', icon: 'FileText' },
      { label: 'Invoice Journal', href: '/pos/journal', icon: 'Book' },
      { label: 'Reports & Analytics', href: '/pos/reports', icon: 'FileBarChart' },
    ],
  },
  {
    group: 'Workshop',
    module: 'workshop',
    items: [
      { label: 'Equipment', href: '/workshop/equipment', icon: 'Wrench' },
      { label: 'Work Orders', href: '/workshop/work-orders', icon: 'ClipboardList' },
      { label: 'Reports & Analytics', href: '/workshop/reports', icon: 'FileBarChart' },
    ],
  },
  {
    group: 'Fleet & Fuel',
    module: 'fleet',
    items: [
      { label: 'Vehicles & Tracking', href: '/fleet/vehicles', icon: 'Truck' },
      { label: 'Fuel Requisitions', href: '/fleet/requisitions', icon: 'ClipboardList' },
      { label: 'Prepaid Fuel (Accounts)', href: '/fleet/prepaid', icon: 'CreditCard' },
      { label: 'Hauling Trips', href: '/fleet/hauling', icon: 'ArrowLeftRight' },
      { label: 'Reports & Analytics', href: '/fleet/reports', icon: 'FileBarChart' },
    ],
  },
  {
    group: 'FDMS',
    module: 'fdms',
    items: [
      { label: 'Fiscalisation', href: '/fdms', icon: 'QrCode' },
      { label: 'Reports & Analytics', href: '/fdms/reports', icon: 'FileBarChart' },
    ],
  },
  {
    group: 'Messaging',
    module: 'messaging',
    items: [
      { label: 'Messages', href: '/messaging', icon: 'MessageCircle' },
    ],
  },
  {
    group: 'Reports',
    module: 'reports',
    items: [
      { label: 'Reports & Analytics', href: '/reports', icon: 'BarChart3' },
    ],
  },
  {
    group: 'Admin',
    module: 'admin',
    items: [
      { label: 'Users', href: '/admin/users', icon: 'Shield' },
      { label: 'Branches', href: '/admin/branches', icon: 'Building2' },
      { label: 'Settings', href: '/admin/settings', icon: 'Settings' },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role as UserRole | undefined;
  const isLoading = status === 'loading';

  const visibleGroups = isLoading || !role
    ? navGroups
    : navGroups.filter((group) => {
        if (!group.module || group.module === 'main') return true;
        return canAccessModule(group.module, role);
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
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-white border-r border-slate-200 transition-all duration-300 flex flex-col',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-200">
        <img src="/logo.png" alt="Mineazy" className="h-20 w-20 object-contain flex-shrink-0" />
        {!collapsed && (
          <span className="font-semibold text-slate-900 text-lg whitespace-nowrap">Mineazy ERP</span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {visibleGroups.map((group) => {
          const isExpanded = expandedGroups.includes(group.group);

          return (
            <div key={group.group}>
              <button
                onClick={() => toggleGroup(group.group)}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors"
              >
                {!collapsed && (
                  <>
                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    <span>{group.group}</span>
                  </>
                )}
              </button>
              {isExpanded && (
                <div className="space-y-1 mt-1">
                  {group.items.map((item) => {
                    const ItemIcon = iconMap[item.icon];
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                          active
                            ? 'bg-mine-blue-50 text-mine-blue-800 font-medium'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        )}
                        title={collapsed ? item.label : undefined}
                      >
                        {ItemIcon && <ItemIcon className="h-4 w-4 flex-shrink-0" />}
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
  );
}

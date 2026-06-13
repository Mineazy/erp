'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { canAccessModule } from '@/lib/authz';
import type { UserRole } from '@/lib/authz';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Book,
  Scale,
  Receipt,
  CreditCard,
  Wallet,
  Package,
  ShoppingCart,
  Truck,
  Users,
  Building2,
  ChevronDown,
  ChevronRight,
  LucideIcon,
} from 'lucide-react';
import { useState } from 'react';

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  BookOpen,
  FileText,
  Book,
  Scale,
  Receipt,
  CreditCard,
  Wallet,
  Package,
  ShoppingCart,
  Truck,
  Users,
  Building2,
};

const navGroups = [
  {
    group: 'Main',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    ],
  },
  {
    group: 'Financial',
    items: [
      { label: 'Chart of Accounts', href: '/financial/coa', icon: 'BookOpen' },
      { label: 'Journal Entries', href: '/financial/journal', icon: 'FileText' },
      { label: 'General Ledger', href: '/financial/ledger', icon: 'Book' },
      { label: 'Trial Balance', href: '/financial/trial-balance', icon: 'Scale' },
      { label: 'Accounts Receivable', href: '/financial/ar', icon: 'Receipt' },
      { label: 'Accounts Payable', href: '/financial/ap', icon: 'CreditCard' },
      { label: 'Cashbook', href: '/financial/cashbook', icon: 'Wallet' },
    ],
  },
  {
    group: 'Inventory',
    items: [
      { label: 'Products', href: '/inventory/products', icon: 'Package' },
      { label: 'Sales Orders', href: '/inventory/sales-orders', icon: 'ShoppingCart' },
      { label: 'Purchase Orders', href: '/inventory/purchase-orders', icon: 'Truck' },
    ],
  },
  {
    group: 'CRM',
    items: [
      { label: 'Customers', href: '/crm/customers', icon: 'Users' },
      { label: 'Suppliers', href: '/crm/suppliers', icon: 'Building2' },
    ],
  },
  {
    group: 'POS',
    items: [
      { label: 'POS Terminal', href: '/pos', icon: 'ShoppingCart' },
      { label: 'Sessions', href: '/pos/sessions', icon: 'Receipt' },
      { label: 'History', href: '/pos/history', icon: 'FileText' },
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

  const moduleMap: Record<string, string> = {
    Financial: 'financial',
    Inventory: 'inventory',
    CRM: 'crm',
    POS: 'pos',
    Main: 'main',
  };

  const visibleGroups = isLoading
    ? navGroups
    : navGroups.filter((group) => {
        const mod = moduleMap[group.group];
        if (!mod || mod === 'main') return true;
        return canAccessModule(mod, role);
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
        <div className="h-8 w-8 rounded-lg bg-mine-blue-800 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">M</span>
        </div>
        {!collapsed && (
          <span className="font-semibold text-slate-900 text-lg whitespace-nowrap">Mineazy ERP</span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {visibleGroups.map((group) => {
          const isExpanded = expandedGroups.includes(group.group);
          const Icon = iconMap[group.items[0]?.icon] || ChevronDown;

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

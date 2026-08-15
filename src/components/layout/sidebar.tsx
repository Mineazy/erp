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
import { navGroups } from '@/lib/navigation';
import { useState } from 'react';

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, BookOpen, FileText, Book, Scale, Receipt, CreditCard, Wallet,
  Package, ShoppingCart, Truck, Users, Building2, Target, Percent, ClipboardList,
  Warehouse, ArrowLeftRight, ClipboardCheck, Wrench, QrCode, BarChart3, Shield, Settings,
  RotateCcw, MessageCircle, AlertTriangle, TrendingUp, LineChart, Bell,
  FileBarChart, ScrollText, FolderTree, Award, Crown, Handshake, Store, Briefcase, ListTodo, DollarSign, Clock,
};

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
  const permissions = (session?.user as any)?.permissions;
  const isLoading = status === 'loading';

  const visibleGroups = isLoading || !role
    ? navGroups
    : navGroups
        .filter((group) => {
          if (!group.module) return true;
          return canAccessModule(group.module, role, department, permissions);
        })
        .map((group) => {
          if (!permissions?.menus) return group;
          // Filter items based on explicit permissions
          return {
            ...group,
            items: group.items.filter(item => {
              if (!group.module) return true;
              return permissions.menus.includes(item.href);
            })
          };
        })
        .filter(group => group.items.length > 0);

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

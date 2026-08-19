'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { cn } from '@/lib/utils';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const isStandalonePage = pathname === '/login' || pathname.startsWith('/verify');

  if (isStandalonePage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <Header collapsed={collapsed} onToggleSidebar={() => setCollapsed(!collapsed)} />
      <main
        className={cn(
          'pt-20 pb-8 px-4 md:px-6 transition-all duration-300 ml-0',
          collapsed ? 'md:ml-16' : 'md:ml-64'
        )}
      >
        {children}
      </main>
    </div>
  );
}

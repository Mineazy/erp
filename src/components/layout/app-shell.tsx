'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { cn } from '@/lib/utils';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const isStandalonePage = pathname === '/login' || pathname.startsWith('/verify');

  useEffect(() => {
    const onResizeOrMount = () => {
      if (window.innerWidth < 768) setCollapsed(true);
    };
    onResizeOrMount();
    window.addEventListener('resize', onResizeOrMount);
    return () => window.removeEventListener('resize', onResizeOrMount);
  }, []);

  if (isStandalonePage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <Header collapsed={collapsed} onToggleSidebar={() => setCollapsed(!collapsed)} />
      <main
        className={cn(
          'pt-20 pb-8 px-3 sm:px-4 md:px-6 transition-all duration-300 ml-0',
          collapsed ? 'md:ml-16' : 'md:ml-64'
        )}
        style={{ ['--frame-left' as any]: collapsed ? '4rem' : '16rem', ['--frame-top' as any]: '5rem' }}
      >
        {children}
      </main>
    </div>
  );
}

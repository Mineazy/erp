'use client';

import { useSession, signOut } from 'next-auth/react';
import { Avatar } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Menu, LogOut, User, Settings, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
}

export function Header({ collapsed, onToggleSidebar }: HeaderProps) {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <header
      className={cn(
        'fixed top-0 z-30 h-16 bg-white border-b border-slate-200 transition-all duration-300 flex items-center justify-between px-6',
        collapsed ? 'left-16' : 'left-64'
      )}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          {collapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">ERP System</h1>
          <p className="text-xs text-slate-500">Mineazy Mining Solutions</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <DropdownMenu
          trigger={
            <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 rounded-lg p-2 transition-colors">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-900">{user?.name || 'User'}</p>
                <p className="text-xs text-slate-500 capitalize">{((user as { role?: string })?.role) || 'User'}</p>
              </div>
              <Avatar name={user?.name || 'User'} size="sm" />
            </div>
          }
        >
          <DropdownMenuItem onClick={() => {}}>
            <User className="h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => {}}>
            <Settings className="h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/login' })} destructive>
            <LogOut className="h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenu>
      </div>
    </header>
  );
}

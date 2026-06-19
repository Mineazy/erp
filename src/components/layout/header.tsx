'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast, dismissToast } from '@/components/ui/toast';
import { Menu, LogOut, User, Lock, ChevronLeft, Mail, Shield, Clock, Building } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
}

export function Header({ collapsed, onToggleSidebar }: HeaderProps) {
  const { data: session } = useSession();
  const user = session?.user as { id?: string; name?: string; email?: string; role?: string; department?: string; branchId?: string; branchName?: string } | undefined;

  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast('All fields are required', 'warning');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast('New passwords do not match', 'warning');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast('Password must be at least 6 characters', 'warning');
      return;
    }
    try {
      const tid = toast('Changing password...', 'info', 120000);
      let res;
      try {
        res = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentPassword: passwordForm.currentPassword,
            newPassword: passwordForm.newPassword,
          }),
        });
      } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to change password' }));
        dismissToast(tid);
        toast(err.error || 'Failed to change password', 'error');
        return;
      }
      dismissToast(tid);
      toast('Password changed successfully', 'success');
      setPasswordOpen(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    }
  };

  return (
    <>
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
                  <p className="text-xs text-slate-500 capitalize">{user?.role || 'User'}{user?.branchName ? ` · ${user.branchName}` : ''}</p>
                </div>
                <Avatar name={user?.name || 'User'} size="sm" />
              </div>
            }
          >
            <DropdownMenuItem onClick={() => setProfileOpen(true)}>
              <User className="h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPasswordOpen(true)}>
              <Lock className="h-4 w-4" />
              Change Password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/login' })} destructive>
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
      </header>

      {/* Profile Dialog */}
      <Dialog open={profileOpen} onClose={() => setProfileOpen(false)} title="Profile" size="sm">
        <div className="space-y-4">
          <div className="flex flex-col items-center py-2">
            <Avatar name={user?.name || 'User'} size="lg" />
            <h3 className="text-lg font-semibold text-slate-900 mt-3">{user?.name || 'User'}</h3>
            <p className="text-sm text-slate-500 capitalize">{user?.role || 'User'}</p>
          </div>
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-slate-400" />
              <span className="text-slate-600">{user?.email || '—'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Shield className="h-4 w-4 text-slate-400" />
              <span className="text-slate-600 capitalize">Role: {user?.role || '—'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Building className="h-4 w-4 text-slate-400" />
              <span className="text-slate-600">Department: {user?.department || '—'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Building className="h-4 w-4 text-slate-400" />
              <span className="text-slate-600">Branch: {user?.branchName || '—'}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setProfileOpen(false)}>Close</Button>
        </DialogFooter>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordOpen} onClose={() => { setPasswordOpen(false); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }} title="Change Password" size="sm">
        <div className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
            placeholder="Enter current password"
          />
          <Input
            label="New Password"
            type="password"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
            placeholder="Enter new password"
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
            placeholder="Confirm new password"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setPasswordOpen(false); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}>Cancel</Button>
          <Button onClick={handleChangePassword}>Change Password</Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}

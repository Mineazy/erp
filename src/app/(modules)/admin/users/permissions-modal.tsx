import { useState, useEffect } from 'react';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { navGroups } from '@/lib/navigation';
import { toast, dismissToast } from '@/components/ui/toast';

interface PermissionsModalProps {
  user: any | null;
  onClose: () => void;
  onSave: () => void;
}

export function PermissionsModal({ user, onClose, onSave }: PermissionsModalProps) {
  const [modules, setModules] = useState<string[]>([]);
  const [menus, setMenus] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setModules(user.permissions?.modules || []);
      setMenus(user.permissions?.menus || []);
    }
  }, [user]);

  if (!user) return null;

  const handleModuleToggle = (module: string, checked: boolean) => {
    setModules(prev => checked ? [...prev, module] : prev.filter(m => m !== module));
  };

  const handleMenuToggle = (module: string, href: string, checked: boolean) => {
    setMenus(prev => checked ? [...prev, href] : prev.filter(h => h !== href));
    if (checked && !modules.includes(module)) {
      setModules(prev => [...prev, module]);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const tid = toast('Saving permissions...', 'info', 120000);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: { modules, menus } }),
      });
      if (!res.ok) throw new Error('Failed to save permissions');
      dismissToast(tid);
      toast('Permissions updated successfully', 'success');
      onSave();
    } catch (e) {
      dismissToast(tid);
      toast('Error saving permissions', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={!!user} onClose={onClose} title={`Manage Permissions - ${user.name}`} size="lg">
      <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-6">
        {navGroups.map((group) => (
          <div key={group.group} className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-3">
              <Checkbox
                checked={modules.includes(group.module)}
                onChange={(e) => handleModuleToggle(group.module, e.target.checked)}
              />
              <span className="font-semibold text-slate-800">{group.group}</span>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {group.items.map(item => (
                <div key={item.href} className="flex items-center gap-3 pl-4">
                  <Checkbox
                    checked={menus.includes(item.href)}
                    onChange={(e) => handleMenuToggle(group.module, item.href, e.target.checked)}
                  />
                  <span className="text-sm text-slate-600">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
        <Button onClick={handleSave} disabled={isSaving}>Save Permissions</Button>
      </DialogFooter>
    </Dialog>
  );
}

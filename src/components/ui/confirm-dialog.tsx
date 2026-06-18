'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AlertTriangle, Info, Trash2 } from 'lucide-react';

type Variant = 'danger' | 'warning' | 'info';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
}

type Resolver = (value: boolean) => void;
let showFn: ((opts: ConfirmOptions) => Promise<boolean>) | null = null;

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  if (!showFn) return Promise.resolve(false);
  return showFn(opts);
}

const variantIcons = {
  danger: Trash2,
  warning: AlertTriangle,
  info: Info,
};

const variantStyles = {
  danger: { icon: 'text-red-500 bg-red-50', button: 'bg-red-600 hover:bg-red-700' },
  warning: { icon: 'text-amber-500 bg-amber-50', button: 'bg-amber-600 hover:bg-amber-700' },
  info: { icon: 'text-blue-500 bg-blue-50', button: 'bg-mine-blue-800 hover:bg-mine-blue-900' },
};

export function ConfirmDialogProvider() {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<Resolver | null>(null);

  useEffect(() => {
    showFn = (o: ConfirmOptions) => {
      setOpts(o);
      setOpen(true);
      return new Promise<boolean>((resolve) => {
        setResolver(() => resolve);
      });
    };
    return () => { showFn = null; };
  }, []);

  const handleConfirm = useCallback(() => {
    setOpen(false);
    resolver?.(true);
  }, [resolver]);

  const handleCancel = useCallback(() => {
    setOpen(false);
    resolver?.(false);
  }, [resolver]);

  if (!opts) return null;

  const Icon = variantIcons[opts.variant || 'info'];
  const styles = variantStyles[opts.variant || 'info'];

  return (
    <Dialog open={open} onClose={handleCancel} title="" size="sm">
      <div className="flex flex-col items-center text-center py-2">
        <div className={cn('rounded-full p-3 mb-4', styles.icon)}>
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">{opts.title}</h3>
        <p className="text-sm text-slate-500 max-w-xs">{opts.message}</p>
      </div>
      <DialogFooter className="justify-center gap-3">
        <Button variant="outline" onClick={handleCancel}>
          {opts.cancelLabel || 'Cancel'}
        </Button>
        <Button className={styles.button} onClick={handleConfirm}>
          {opts.confirmLabel || 'Confirm'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

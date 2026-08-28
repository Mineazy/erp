import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
  bounded?: boolean;
}

export function Dialog({ open, onClose, title, description, children, className, size = 'md', bounded = false }: DialogProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  React.useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Element;
      if (target && target.closest?.('[data-dialog-ignore]')) return;
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onCloseRef.current();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  if (!open) return null;

  const isFull = size === 'full';
  const sizeClasses: Record<string, string> = {
    sm: 'w-full sm:max-w-sm',
    md: 'w-full sm:max-w-md',
    lg: 'w-full sm:max-w-lg',
    xl: 'w-full sm:max-w-xl',
    '2xl': 'w-full sm:max-w-2xl',
    '3xl': 'w-full sm:max-w-3xl',
    '4xl': 'w-full sm:max-w-4xl',
    '5xl': 'w-full sm:max-w-5xl',
    full: 'w-full',
  };

  const frameStyle = bounded
    ? { left: 'var(--frame-left, 0px)', top: 'var(--frame-top, 0px)' }
    : undefined;

  return (
    <div className={cn('fixed inset-0 z-50 flex justify-center', isFull ? 'items-stretch' : 'items-end sm:items-center')} style={frameStyle}>
      <div className="fixed inset-0 bg-black/50" style={bounded ? { left: 'var(--frame-left, 0px)', top: 'var(--frame-top, 0px)' } : undefined} />
      <div
        ref={ref}
        className={cn(
          isFull
            ? 'relative z-50 h-full w-full overflow-y-auto bg-white p-5 sm:p-6 shadow-lg'
            : 'relative z-50 max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-lg border border-slate-200 bg-white p-5 sm:p-6 shadow-lg sm:max-h-[90vh]',
          sizeClasses[size],
          className
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && <h2 className="text-lg font-semibold text-slate-900">{title}</h2>}
            {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function DialogFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex items-center justify-end space-x-2 mt-6', className)}>
      {children}
    </div>
  );
}

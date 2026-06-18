'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ─── Types ───────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

// ─── Global store ────────────────────────────────────
type Listener = (toasts: Toast[]) => void;
let toasts: Toast[] = [];
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((fn) => fn([...toasts]));
}

export function toast(message: string, type: ToastType = 'info', duration = 4000) {
  const id = crypto.randomUUID();
  toasts = [...toasts, { id, type, message, duration }];
  notify();
  return id;
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

// ─── Icons & styles ──────────────────────────────────
const iconMap: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const styleMap: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
  success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', icon: 'text-green-500' },
  error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: 'text-red-500' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: 'text-amber-500' },
  info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: 'text-blue-500' },
};

// ─── Individual toast ────────────────────────────────
function ToastItem({ t, onDone }: { t: Toast; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, t.duration);
    return () => clearTimeout(timer);
  }, [t.duration, onDone]);

  const Icon = iconMap[t.type];
  const s = styleMap[t.type];

  return (
    <div
      role="alert"
      className={cn(
        'pointer-events-auto flex items-start gap-3 rounded-lg border p-4 shadow-lg',
        s.bg, s.border
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', s.icon)} />
      <p className={cn('text-sm font-medium flex-1', s.text)}>{t.message}</p>
      <button
        onClick={onDone}
        className={cn('shrink-0 rounded p-0.5 opacity-70 hover:opacity-100 transition-opacity', s.text)}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Toaster container ───────────────────────────────
export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    const listener: Listener = setItems;
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80 pointer-events-none">
      {items.map((t) => (
          <div key={t.id} className="slide-in-from-right pointer-events-auto">
          <ToastItem t={t} onDone={() => dismissToast(t.id)} />
        </div>
      ))}
    </div>
  );
}

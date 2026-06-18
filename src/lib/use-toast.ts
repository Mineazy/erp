'use client';

import { useState, useCallback, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

type AddToastFn = (t: Toast) => void;
let addToastFn: AddToastFn | null = null;
let removeToastFn: ((id: string) => void) | null = null;

export function registerAddToast(fn: AddToastFn | null) {
  addToastFn = fn;
}
export function registerRemoveToast(fn: ((id: string) => void) | null) {
  removeToastFn = fn;
}

export function toast(message: string, type: ToastType = 'info', duration = 4000) {
  const id = crypto.randomUUID();
  addToastFn?.({ id, type, message, duration });
  return id;
}

export function dismissToast(id: string) {
  removeToastFn?.(id);
}

export function useToastState() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((t: Toast) => {
    setToasts((prev) => [...prev, t]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    registerAddToast(addToast);
    registerRemoveToast(removeToast);
    return () => {
      registerAddToast(null);
      registerRemoveToast(null);
    };
  }, [addToast, removeToast]);

  return { toasts, removeToast };
}

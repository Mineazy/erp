'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from '@/components/ui/toast';
import { ConfirmDialogProvider } from '@/components/ui/confirm-dialog';
import { PWARegister } from '@/components/pwa-register';
import { TauriSync } from '@/components/tauri-sync';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster />
      <ConfirmDialogProvider />
      <PWARegister />
      <TauriSync />
    </SessionProvider>
  );
}

'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from '@/components/ui/toast';
import { ConfirmDialogProvider } from '@/components/ui/confirm-dialog';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster />
      <ConfirmDialogProvider />
    </SessionProvider>
  );
}

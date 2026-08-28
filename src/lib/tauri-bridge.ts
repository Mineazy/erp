'use client';

// Bridge: browser IDB -> Tauri SQLite when running inside Tauri, fallback to IDB otherwise
export const isTauri = () =>
  typeof window !== 'undefined' && (window as any).__TAURI__ !== undefined;

export async function tauriEnqueue(tx: any) {
  if (!isTauri()) return false;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('enqueue_offline', {
      tx: {
        id: tx.id,
        type: tx.type || 'pos_payment',
        url: tx.url || '/api/pos/transactions',
        method: tx.method || 'POST',
        payload: JSON.stringify(tx.payload),
        idempotency_key: tx.idempotencyKey || tx.id,
        timestamp: tx.timestamp || Date.now(),
        status: 'pending',
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function tauriPendingCount(): Promise<number> {
  if (!isTauri()) return 0;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<number>('pending_count');
  } catch {
    return 0;
  }
}

export async function tauriPrintRaw(printerName: string, data: string) {
  if (!isTauri()) {
    // fallback to browser print
    window.print();
    return;
  }
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke('print_raw', { printerName, data, isBase64: false });
}

export async function tauriGetVersion(): Promise<string> {
  if (!isTauri()) return 'web';
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<string>('get_app_version');
  } catch {
    return 'web';
  }
}

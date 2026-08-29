'use client';
import { useEffect, useState } from 'react';
import { isTauri } from '@/lib/tauri-bridge';

// When running inside Tauri, poll Rust SQLite queue and replay via http plugin
// Fix hydration #418: isTauri() must not differ between server and client initial render
export function TauriSync() {
  const [pending, setPending] = useState(0);
  const [tauri, setTauri] = useState(false);

  useEffect(() => {
    setTauri(isTauri());
  }, []);

  useEffect(() => {
    if (!tauri) return;
    let timer: any;
    const tick = async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const list: any[] = await invoke('get_pending');
        setPending(list.length);
        if (list.length === 0 || !navigator.onLine) return;
        for (const tx of list) {
          try {
            const res = await fetch(tx.url, {
              method: tx.method,
              headers: { 'Content-Type': 'application/json', 'Idempotency-Key': tx.idempotency_key },
              body: tx.payload,
            });
            if (res.ok) await invoke('mark_synced', { id: tx.id });
            else await invoke('mark_failed', { id: tx.id, error: await res.text() });
          } catch (e: any) {
            await invoke('mark_failed', { id: tx.id, error: e?.message || 'network' });
          }
        }
      } catch {}
    };
    tick();
    timer = setInterval(tick, 15000);
    window.addEventListener('online', tick);
    return () => { clearInterval(timer); window.removeEventListener('online', tick); };
  }, [tauri]);

  if (!tauri) return null;
  return <div className="hidden" data-tauri-pending={pending} />;
}

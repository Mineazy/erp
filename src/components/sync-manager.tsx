'use client';

import { useEffect, useRef, useState } from 'react';
import { useNetwork } from '@/lib/hooks/use-network';
import { getOfflineTransactions, removeOfflineTransaction, markOfflineTransactionFailed } from '@/lib/db';
import { toast } from '@/components/ui/toast';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export function SyncManager() {
  const { isOnline } = useNetwork();
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const syncInProgress = useRef(false);
  const initialCheckDone = useRef(false);

  const checkPending = async () => {
    try {
      const txs = await getOfflineTransactions();
      const pending = txs.filter((t) => t.status === 'pending' || !t.status);
      setPendingCount(pending.length);
      return pending;
    } catch (e) {
      console.error('Failed to get offline transactions', e);
      return [];
    }
  };

  useEffect(() => {
    checkPending().then((pending) => {
      initialCheckDone.current = true;
      if (pending.length === 0) return;
      // Only auto-sync on first load if there are truly old pending items (older than 30s)
      const now = Date.now();
      const stale = pending.filter((t) => now - t.timestamp > 30000);
      if (stale.length > 0 && isOnline) {
        syncOfflineData();
      }
    });
    const interval = setInterval(checkPending, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOnline && pendingCount > 0 && !syncing && initialCheckDone.current) {
      syncOfflineData();
    }
  }, [isOnline, pendingCount]);

  const syncOfflineData = async () => {
    if (syncInProgress.current) return;
    syncInProgress.current = true;
    setSyncing(true);
    try {
      const txs = await getOfflineTransactions();
      const pending = txs.filter((t) => t.status === 'pending' || !t.status);
      if (pending.length === 0) {
        setSyncing(false);
        syncInProgress.current = false;
        return;
      }

      toast(`Syncing ${pending.length} offline transaction${pending.length > 1 ? 's' : ''}...`, 'info');

      let synced = 0;
      let failed = 0;

      for (const tx of pending) {
        const method = tx.method || 'POST';
        const url = tx.url
          ? tx.url
          : (() => {
              if (tx.type === 'pos_payment') return '/api/pos/transactions';
              if (tx.type === 'fleet_hauling') return '/api/fleet/hauling';
              if (tx.type === 'fleet_requisition') return '/api/fleet/requisitions';
              if (tx.type === 'inventory_count') return '/api/inventory/stock/counts';
              return '/api/' + tx.type;
            })();

        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          ...(tx.idempotencyKey && { 'Idempotency-Key': tx.idempotencyKey }),
        };

        try {
          const res = await fetch(url, {
            method,
            headers,
            body: JSON.stringify(tx.payload),
          });

          if (res.ok) {
            await removeOfflineTransaction(tx.id);
            synced++;
          } else {
            const txt = await res.text();
            console.error(`Failed to sync tx ${tx.id}: ${txt}`);
            await markOfflineTransactionFailed(tx.id, txt || 'HTTP error');
            failed++;
          }
        } catch (e) {
          console.error(`Error syncing tx ${tx.id}`, e);
          await markOfflineTransactionFailed(tx.id, e instanceof Error ? e.message : 'network error');
          failed++;
        }
      }

      await checkPending();

      if (synced > 0 && failed === 0) {
        toast(`${synced} offline transaction${synced > 1 ? 's' : ''} synced successfully!`, 'success');
      } else if (synced > 0 && failed > 0) {
        toast(`${synced} synced, ${failed} failed.`, 'warning');
      } else if (failed > 0) {
        toast(`${failed} transaction${failed > 1 ? 's' : ''} failed to sync.`, 'error');
      }
    } catch (e) {
      console.error('Sync failed', e);
    } finally {
      setSyncing(false);
      syncInProgress.current = false;
    }
  };

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 text-red-600 bg-red-50 px-2 sm:px-3 py-1.5 rounded-full text-xs font-semibold border border-red-200">
        <WifiOff className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Offline {pendingCount > 0 && `(${pendingCount} pending)`}</span>
      </div>
    );
  }

  if (syncing) {
    return (
      <div className="flex items-center gap-2 text-mine-blue-600 bg-mine-blue-50 px-2 sm:px-3 py-1.5 rounded-full text-xs font-semibold border border-mine-blue-200">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        <span className="hidden sm:inline">Syncing {pendingCount}...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-2 sm:px-3 py-1.5 rounded-full text-xs font-semibold border border-emerald-200">
      <Wifi className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Online</span>
    </div>
  );
}

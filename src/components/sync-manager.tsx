'use client';

import { useEffect, useState } from 'react';
import { useNetwork } from '@/lib/hooks/use-network';
import { getOfflineTransactions, removeOfflineTransaction } from '@/lib/db';
import { toast } from '@/components/ui/toast';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export function SyncManager() {
  const { isOnline } = useNetwork();
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const checkPending = async () => {
    try {
      const txs = await getOfflineTransactions();
      setPendingCount(txs.length);
    } catch (e) {
      console.error('Failed to get offline transactions', e);
    }
  };

  useEffect(() => {
    checkPending();
    const interval = setInterval(checkPending, 10000); // Check every 10s just in case
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOnline && pendingCount > 0 && !syncing) {
      syncOfflineData();
    }
  }, [isOnline, pendingCount]);

  const syncOfflineData = async () => {
    setSyncing(true);
    try {
      const txs = await getOfflineTransactions();
      if (txs.length === 0) {
        setSyncing(false);
        return;
      }

      toast(`Syncing ${txs.length} offline transactions...`, 'info');

      for (const tx of txs) {
        try {
          let url = '';
          if (tx.type === 'pos_payment') url = '/api/pos/transactions';
          else if (tx.type === 'fleet_hauling') url = '/api/fleet/hauling';
          else if (tx.type === 'fleet_requisition') url = '/api/fleet/requisitions';
          else if (tx.type === 'inventory_count') url = '/api/inventory/stock/counts';
          
          if (!url) continue;

          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tx.payload),
          });

          if (res.ok) {
            await removeOfflineTransaction(tx.id);
          } else {
            console.error(`Failed to sync transaction ${tx.id}`, await res.text());
          }
        } catch (e) {
          console.error(`Error syncing transaction ${tx.id}`, e);
        }
      }

      await checkPending();
      toast('Offline sync complete!', 'success');
    } catch (e) {
      console.error('Sync failed', e);
    } finally {
      setSyncing(false);
    }
  };

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1.5 rounded-full text-xs font-semibold border border-red-200">
        <WifiOff className="h-3.5 w-3.5" />
        Offline {pendingCount > 0 && `(${pendingCount} pending)`}
      </div>
    );
  }

  if (syncing) {
    return (
      <div className="flex items-center gap-2 text-mine-blue-600 bg-mine-blue-50 px-3 py-1.5 rounded-full text-xs font-semibold border border-mine-blue-200">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        Syncing {pendingCount}...
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full text-xs font-semibold border border-emerald-200">
      <Wifi className="h-3.5 w-3.5" />
      Online
    </div>
  );
}

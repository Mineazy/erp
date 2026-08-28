'use client';

import { useEffect, useState } from 'react';
import { getLocalRequisitions, createLocalRequisition, updateLocalRequisition, deleteLocalRequisition, syncLocalRequisitions, initLocalDb } from '@/lib/local-db';
import { useNetwork } from '@/lib/hooks/use-network';
import { apiFetch } from '@/lib/api-fetch';

interface Requisition {
  id: string;
  vehicleId: string;
  vehicle?: { plateNumber: string; make: string; model: string };
  driverName: string;
  fuelType: string;
  litersRequested: number;
  branch?: string;
  destination?: string;
  gasStation?: string;
  currentOdometer?: number;
  status: string;
  purpose: string;
  notes?: string;
  treasurerApprovedBy?: string;
  treasurerApprovedAt?: string;
  financeManagerApprovedBy?: string;
  financeManagerApprovedAt?: string;
  userId: string;
  userName: string;
  createdAt: string;
  updatedAt: string;
}

export function useLocalRequisitions() {
  const { isOnline } = useNetwork();
  const [localReqs, setLocalReqs] = useState<any[]>([]);
  const [serverReqs, setServerReqs] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Load local store on mount
  useEffect(() => {
    initLocalDb().then(() => {
      getLocalRequisitions().then(setLocalReqs);
    });
  }, []);

  // Sync local with server when online
  useEffect(() => {
    if (!isOnline) return;
    setIsSyncing(true);
    syncLocalRequisitions().then(({ synced, failed }) => {
      setIsSyncing(false);
      setLastSync(new Date());
      // Refresh server state after sync
      fetch('/api/fleet/requisitions')
        .then((r) => r.json())
        .then(setServerReqs)
        .catch(console.error);
    });
  }, [isOnline]);

  // Whenever local store changes, sync to server (if online)
  useEffect(() => {
    if (!isOnline) return;
    const id = requestAnimationFrame(() => {
      syncLocalRequisitions();
    });
    return () => cancelAnimationFrame(id);
  }, [localReqs, isOnline]);

  return {
    localReqs,
    serverReqs,
    isSyncing,
    lastSync,
    refreshServer: () => fetch('/api/fleet/requisitions')
      .then((r) => r.json())
      .then(setServerReqs)
      .catch(console.error),
  };
}
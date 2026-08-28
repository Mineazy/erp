import { initDB, saveOfflineTransaction, getOfflineTransactions, removeOfflineTransaction, markOfflineTransactionFailed } from './db';

export interface LocalRequisition {
  id: string;
  vehicleId: string;
  userId: string;
  userName: string;
  fuelType: string;
  litersRequested: number;
  purpose: string;
  status: string;
  approvedBy: string | null;
  treasurerApprovedBy: string | null;
  treasurerApprovedAt?: string | null;
  financeManagerApprovedBy: string | null;
  financeManagerApprovedAt?: string | null;
  qrCodeUrl: string | null;
  redeemToken: string | null;
  gasStation: string | null;
  driverName?: string | null;
  branch?: string | null;
  destination?: string | null;
  currentOdometer?: number | string | null;
  createdAt: string;
}

// Store name for requisitions
const REQUISITIONS_STORE = 'local_requisitions';

export async function initLocalDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('mineazy_local', 1);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(REQUISITIONS_STORE)) {
        db.createObjectStore(REQUISITIONS_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getLocalRequisitions(): Promise<LocalRequisition[]> {
  const db = await initLocalDb();
  return new Promise<LocalRequisition[]>((resolve, reject) => {
    const tx = db.transaction(REQUISITIONS_STORE, 'readonly');
    const store = tx.objectStore(REQUISITIONS_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function createLocalRequisition(requisition: LocalRequisition): Promise<LocalRequisition> {
  const db = await initLocalDb();
  return new Promise<LocalRequisition>((resolve, reject) => {
    const tx = db.transaction(REQUISITIONS_STORE, 'readwrite');
    const store = tx.objectStore(REQUISITIONS_STORE);
    const request = store.add(requisition);
    request.onsuccess = () => resolve(requisition);
    request.onerror = () => reject(request.error);
  });
}

export async function updateLocalRequisition(id: string, updates: Partial<LocalRequisition>): Promise<void> {
  const db = await initLocalDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(REQUISITIONS_STORE, 'readwrite');
    const store = tx.objectStore(REQUISITIONS_STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const existing = getReq.result;
      if (existing) {
        const updated = { ...existing, ...updates } as LocalRequisition;
        store.put(updated);
      }
    };
    tx.onerror = () => reject('failed to update');
    tx.oncomplete = () => resolve();
  });
}

export async function deleteLocalRequisition(id: string): Promise<void> {
  const db = await initLocalDb();
  return removeOfflineTransaction(id); // re-use existing helper
}

// Sync local requisitions to server API
export async function syncLocalRequisitions(): Promise<{ synced: number; failed: number }> {
  const txs = await getOfflineTransactions();
  let synced = 0;
  let failed = 0;

  for (const tx of txs) {
    if (tx.type !== 'fleet_requisition' || tx.status !== 'pending') continue;

    const url = tx.url || '/api/fleet/requisitions';
    const method = tx.method || 'POST';
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
        await markOfflineTransactionFailed(tx.id, await res.text());
        failed++;
      }
    } catch (e) {
      await markOfflineTransactionFailed(tx.id, e instanceof Error ? e.message : 'network error');
      failed++;
    }
  }

  return { synced, failed };
}
const DB_NAME = 'mineazy_erp_db';
const DB_VERSION = 3;

export interface OfflineTransaction {
  id: string; // uuid generated locally
  type: 'pos_payment' | 'fleet_hauling' | 'fleet_requisition' | 'inventory_count';
  payload: any;
  timestamp: number;
}

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('offline_transactions')) {
        db.createObjectStore('offline_transactions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('products_cache')) {
        db.createObjectStore('products_cache', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('categories_cache')) {
        db.createObjectStore('categories_cache', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('customers_cache')) {
        db.createObjectStore('customers_cache', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('session_cache')) {
        db.createObjectStore('session_cache', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('vat_rate_cache')) {
        db.createObjectStore('vat_rate_cache', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('taxes_cache')) {
        db.createObjectStore('taxes_cache', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveOfflineTransaction = async (transaction: OfflineTransaction) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('offline_transactions', 'readwrite');
    const store = tx.objectStore('offline_transactions');
    const request = store.add(transaction);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getOfflineTransactions = async (): Promise<OfflineTransaction[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_transactions', 'readonly');
    const store = tx.objectStore('offline_transactions');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const removeOfflineTransaction = async (id: string) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('offline_transactions', 'readwrite');
    const store = tx.objectStore('offline_transactions');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const cacheData = async (storeName: string, data: any[]) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    // Clear existing cache first
    store.clear().onsuccess = () => {
      data.forEach((item) => {
        store.put(item);
      });
    };
    
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getCachedData = async (storeName: string): Promise<any[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

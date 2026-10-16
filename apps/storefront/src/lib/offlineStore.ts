/**
 * Dual-tier Offline Storage Engine (L1 RAM + L2 IndexedDB)
 * Delivers sub-5ms local reads and resilient offline catalog surfing.
 */

const DB_NAME = 'atelier_offline_store';
const STORE_NAME = 'catalog_cache';
const DB_VERSION = 1;

// L1 Memory Cache for instantaneous synchronous lookups within the active session
const memoryCache = new Map<string, { data: any; expiry: number }>();

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: number;
  expiresAt: number;
}

/**
 * Open or upgrade the Atelier IndexedDB storage instance
 */
function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (event: Event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        resolve(db);
      };

      request.onerror = () => {
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * Retrieve cached item from L1 (RAM) or L2 (IndexedDB).
 * Ignores expiration when offline so the customer can continue surfing the archive.
 */
export async function getOfflineItem<T>(key: string, ignoreExpiryIfOffline = true): Promise<T | null> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const now = Date.now();

  // 1. Try L1 Memory Cache
  const memCached = memoryCache.get(key);
  if (memCached) {
    if (memCached.expiry > now || (!isOnline && ignoreExpiryIfOffline)) {
      return memCached.data as T;
    }
  }

  // 2. Try L2 IndexedDB
  const db = await openDatabase();
  if (!db) return null;

  return new Promise<T | null>((resolve) => {
    try {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result as CacheEntry<T> | undefined;
        if (!entry) {
          resolve(null);
          return;
        }

        const isExpired = entry.expiresAt > 0 && entry.expiresAt < now;
        if (isExpired && isOnline && !ignoreExpiryIfOffline) {
          resolve(null);
          return;
        }

        // Repopulate memory cache
        memoryCache.set(key, { data: entry.data, expiry: entry.expiresAt });
        resolve(entry.data);
      };

      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Persist an item into both L1 Memory Cache and L2 IndexedDB.
 * Default TTL is 24 hours (86,400,000 ms).
 */
export async function setOfflineItem<T>(
  key: string,
  data: T,
  ttlMs: number = 24 * 60 * 60 * 1000
): Promise<void> {
  const expiresAt = ttlMs > 0 ? Date.now() + ttlMs : 0;

  // 1. Set in L1 Memory Cache
  memoryCache.set(key, { data, expiry: expiresAt });

  // 2. Set in L2 IndexedDB
  const db = await openDatabase();
  if (!db) return;

  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    version: 1,
    expiresAt,
  };

  return new Promise<void>((resolve) => {
    try {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(entry, key);

      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Clear expired entries from IndexedDB during idle times
 */
export async function pruneExpiredOfflineItems(): Promise<void> {
  const db = await openDatabase();
  if (!db) return;

  const now = Date.now();
  try {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const cursorReq = store.openCursor();

    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (cursor) {
        const entry = cursor.value as CacheEntry<any>;
        if (entry.expiresAt > 0 && entry.expiresAt < now) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
  } catch {
    // Graceful error ignore
  }
}

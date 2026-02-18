const DB_NAME = "mirchi-storage";
const STORE_NAME = "kv";

type KV = { key: string; value: string };

const cache = new Map<string, string>();
let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function loadAll(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    await new Promise<void>((res, rej) => {
      req.onsuccess = () => {
        const all = req.result as KV[];
        all.forEach((r) => cache.set(r.key, r.value));
        res();
      };
      req.onerror = () => rej(req.error);
    });
  } catch (e) {
    // ignore
  }
}

// initialize: try to load existing DB; if empty, migrate from localStorage
(async () => {
  try {
    await loadAll();
    if (cache.size === 0) {
      // migrate from localStorage if available
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key) continue;
          const v = localStorage.getItem(key);
          if (v !== null) cache.set(key, v);
        }
        // write migrated values to IDB
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        cache.forEach((value, key) => store.put({ key, value }));
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
})();

export function getItem(key: string): string | null {
  const v = cache.get(key);
  return v === undefined ? null : v;
}

export function setItem(key: string, value: string): void {
  cache.set(key, value);
  // async write to IDB
  (async () => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put({ key, value });
    } catch {
      // ignore
    }
  })();
}

export function removeItem(key: string): void {
  cache.delete(key);
  (async () => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(key);
    } catch {
      // ignore
    }
  })();
}

export async function clearAll(): Promise<void> {
  try {
    cache.clear();
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
  } catch {
    // ignore
  }
}

export default { getItem, setItem, removeItem, clearAll };

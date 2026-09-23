import type { QueuedAction, QueuedPhoto } from './api';

type Key = 'trek' | 'products' | 'stopPriceOverrides' | 'customers' | 'customerSeedVersion' | 'districts' | 'regionTreks' | 'assignedTreks' | 'lastSyncedAt' | 'device' | 'lastFix' | 'phoneAddress' | 'weather';
const DB_NAME = 'proh-field-control';
const STORE = 'records';

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function read<T>(key: string): Promise<T | undefined> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function write(key: string, value: unknown): Promise<void> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

const key = (token: string, part: string) => `${token}:${part}`;

export const fieldStore = {
  get: <T>(token: string, part: Key) => read<T>(key(token, part)),
  set: (token: string, part: Key, value: unknown) => write(key(token, part), value),
  queue: async (token: string) => (await read<QueuedAction[]>(key(token, 'queue'))) ?? [],
  setQueue: (token: string, actions: QueuedAction[]) => write(key(token, 'queue'), actions),
  photoQueue: async (token: string) => (await read<QueuedPhoto[]>(key(token, 'photoQueue'))) ?? [],
  setPhotoQueue: (token: string, photos: QueuedPhoto[]) => write(key(token, 'photoQueue'), photos),
};

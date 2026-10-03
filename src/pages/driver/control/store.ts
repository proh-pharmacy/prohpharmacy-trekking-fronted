import type { QueuedAction, QueuedPhoto } from './api';

type Key = 'trek' | 'driverReport' | 'vehicleStock' | 'products' | 'productSeedVersion' | 'stopPriceOverrides' | 'customers' | 'customerSeedVersion' | 'districts' | 'regionTreks' | 'assignedTreks' | 'lastSyncedAt' | 'device' | 'lastFix' | 'phoneAddress' | 'weather';
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

// Store raw bytes alongside metadata instead of a Blob. iOS WebKit purges
// IndexedDB's blob backing store on PWA cold-start, which kills Blob/File
// references even when the Blob was originally constructed in-memory from an
// ArrayBuffer. Storing the ArrayBuffer directly keeps the bytes inline in the
// IDB record (via structured clone) so they survive cold-starts.
interface StoredPhoto extends Omit<QueuedPhoto, 'file'> {
  bytes: ArrayBuffer;
  fileName: string;
  mimeType: string;
}

// Cache the ArrayBuffer per File reference so repeated writes don't re-read
// bytes from the File (which can be an expensive async call on large photos).
const BYTES_CACHE = new WeakMap<File, ArrayBuffer>();

function fromStored(raw: unknown): QueuedPhoto | null {
  if (!raw || typeof raw !== 'object') return null;
  const stored = raw as Partial<StoredPhoto> & {
    file?: unknown;
    bytes?: unknown;
    photoId?: unknown;
    fileName?: unknown;
    mimeType?: unknown;
  };
  if (typeof stored.photoId !== 'string') return null;

  // New format: ArrayBuffer + metadata.
  if (stored.bytes instanceof ArrayBuffer) {
    const fileName = typeof stored.fileName === 'string' ? stored.fileName : 'photo';
    const mimeType = typeof stored.mimeType === 'string' ? stored.mimeType : 'application/octet-stream';
    const file = new File([stored.bytes], fileName, { type: mimeType });
    BYTES_CACHE.set(file, stored.bytes);
    const { fileName: _fn, mimeType: _mt, file: _file, bytes: _b, ...rest } = stored as StoredPhoto & { file?: unknown };
    void _fn; void _mt; void _file; void _b;
    return { ...(rest as Omit<QueuedPhoto, 'file'>), file };
  }

  // Legacy format: Blob. The underlying reference is likely dead after a
  // cold-start on iOS; we still rehydrate it so the user can either retry
  // (will surface a clear error) or remove the entry.
  if (stored.file instanceof Blob) {
    const sourceBlob = stored.file;
    const fileName = (typeof stored.fileName === 'string' && stored.fileName)
      || (sourceBlob instanceof File ? sourceBlob.name : '')
      || 'photo';
    const mimeType = sourceBlob.type || 'application/octet-stream';
    const file = new File([sourceBlob], fileName, { type: mimeType });
    const { fileName: _fn, mimeType: _mt, file: _file, bytes: _b, ...rest } = stored as StoredPhoto & { file?: unknown };
    void _fn; void _mt; void _file; void _b;
    return { ...(rest as Omit<QueuedPhoto, 'file'>), file };
  }

  return null;
}

async function toStored(photo: QueuedPhoto): Promise<StoredPhoto> {
  const cached = BYTES_CACHE.get(photo.file);
  let bytes: ArrayBuffer;
  if (cached && cached.byteLength === photo.file.size && cached.byteLength > 0) {
    bytes = cached;
  } else {
    try {
      bytes = await photo.file.arrayBuffer();
    } catch {
      bytes = new ArrayBuffer(0);
    }
    BYTES_CACHE.set(photo.file, bytes);
  }
  const { file: _file, ...rest } = photo;
  void _file;
  return {
    ...rest,
    bytes,
    fileName: photo.file.name || 'photo',
    mimeType: photo.file.type || 'application/octet-stream',
  };
}

function hydratePhotos(raw: unknown): QueuedPhoto[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(fromStored)
    .filter((photo): photo is QueuedPhoto => photo !== null);
}

async function updatePhotos(
  token: string,
  change: (photos: QueuedPhoto[]) => QueuedPhoto[],
  actions?: QueuedAction[],
): Promise<QueuedPhoto[]> {
  const run = async (): Promise<QueuedPhoto[]> => {
    const existing = hydratePhotos(await read<unknown[]>(key(token, 'photoQueue')));
    const next = change(existing);
    const nextStored = await Promise.all(next.map(toStored));
    const db = await database();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      store.put(nextStored, key(token, 'photoQueue'));
      if (actions) store.put(actions, key(token, 'queue'));
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onabort = tx.onerror = () => { db.close(); reject(tx.error); };
    });
    return next;
  };
  // Serialise reads and writes against the same token so concurrent callers
  // see consistent state while the async serialisation step runs.
  if (navigator.locks) {
    return navigator.locks.request(`photo-store:${token}`, run);
  }
  return run();
}

export const fieldStore = {
  updatePhotos,
  get: <T>(token: string, part: Key) => read<T>(key(token, part)),
  set: (token: string, part: Key, value: unknown) => write(key(token, part), value),
  queue: async (token: string) => (await read<QueuedAction[]>(key(token, 'queue'))) ?? [],
  setQueue: (token: string, actions: QueuedAction[]) => write(key(token, 'queue'), actions),
  photoQueue: async (token: string) => hydratePhotos(await read<unknown[]>(key(token, 'photoQueue'))),
  setPhotoQueue: async (token: string, photos: QueuedPhoto[]) => {
    const stored = await Promise.all(photos.map(toStored));
    await write(key(token, 'photoQueue'), stored);
  },
};

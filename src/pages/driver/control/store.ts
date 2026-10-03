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

interface StoredPhoto extends Omit<QueuedPhoto, 'file'> {
  file: Blob;
  fileName: string;
}

// WebKit sometimes returns zero-byte bodies for File objects restored from
// IndexedDB after a PWA cold start. Storing an ArrayBuffer-backed Blob plus a
// separate filename sidesteps that bug; this cache keeps the same Blob
// reference alive so repeated writes don't re-read the bytes.
const BLOB_CACHE = new WeakMap<File, Blob>();

function fromStored(raw: unknown): QueuedPhoto | null {
  if (!raw || typeof raw !== 'object') return null;
  const stored = raw as Partial<StoredPhoto> & { file?: unknown; photoId?: unknown };
  if (!(stored.file instanceof Blob) || typeof stored.photoId !== 'string') return null;
  const sourceBlob = stored.file;
  const name = stored.fileName
    || (sourceBlob instanceof File ? sourceBlob.name : '')
    || 'photo';
  const type = sourceBlob.type || 'application/octet-stream';
  const file = new File([sourceBlob], name, { type });
  BLOB_CACHE.set(file, sourceBlob);
  const { fileName: _fileName, file: _file, ...rest } = stored as StoredPhoto;
  void _fileName; void _file;
  return { ...(rest as Omit<QueuedPhoto, 'file'>), file };
}

async function toStored(photo: QueuedPhoto): Promise<StoredPhoto> {
  const cached = BLOB_CACHE.get(photo.file);
  let blob: Blob;
  if (cached && cached.size === photo.file.size && cached.type === photo.file.type) {
    blob = cached;
  } else {
    let bytes: ArrayBuffer;
    try {
      bytes = await photo.file.arrayBuffer();
    } catch {
      bytes = new ArrayBuffer(0);
    }
    blob = new Blob([bytes], { type: photo.file.type });
    BLOB_CACHE.set(photo.file, blob);
  }
  const { file: _file, ...rest } = photo;
  void _file;
  return { ...rest, file: blob, fileName: photo.file.name || 'photo' };
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

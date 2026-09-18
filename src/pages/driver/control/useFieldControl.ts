import { useCallback, useEffect, useRef, useState } from 'react';
import { resetTableData } from '../../../components/data-table';
import type { DriverTrek } from '../../../api-client/treks';
import type { Product } from '../../../api-client/products';
import { fieldApi, type ActionType, type FieldCustomer, type QueuedAction, type QueuedPhoto, type RegionTrek } from './api';
import { fieldStore } from './store';

function mergeById<T extends { id: string }>(oldItems: T[], updates: T[]): T[] {
  const items = new Map(oldItems.map((item) => [item.id, item]));
  updates.forEach((item) => items.set(item.id, item));
  return [...items.values()];
}

export function useFieldControl(token: string) {
  const [trek, setTrek] = useState<DriverTrek | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<FieldCustomer[]>([]);
  const [regionTreks, setRegionTreks] = useState<RegionTrek[]>([]);
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [photoQueue, setPhotoQueue] = useState<QueuedPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [error, setError] = useState<string | null>(null);
  const [controlAvailable, setControlAvailable] = useState(false);
  const controlAvailableRef = useRef(false);
  const syncingRef = useRef(false);
  const mutationRef = useRef<Promise<unknown>>(Promise.resolve());

  const refresh = useCallback(async (delta = false) => {
    setRefreshing(true);
    const since = delta ? await fieldStore.get<string>(token, 'lastSyncedAt') : undefined;
    const started = new Date().toISOString();
    const results = await Promise.allSettled([
      fieldApi.getTrek(token), fieldApi.getProducts(token, since),
      fieldApi.getCustomers(token, since), fieldApi.getRegionTreks(token),
    ]);
    const ready = results.slice(0, 3).every((result) => result.status === 'fulfilled');
    controlAvailableRef.current = ready; setControlAvailable(ready);
    if (results[0].status === 'fulfilled') {
      const data = results[0].value;
      setTrek(data); await fieldStore.set(token, 'trek', data);
    } else {
      try {
        const data = await fieldApi.getLegacyTrek(token);
        setTrek(data); await fieldStore.set(token, 'trek', data);
      } catch { /* The page will show the unavailable state if there is no cached trek. */ }
    }
    if (results[1].status === 'fulfilled') {
      const prior = (await fieldStore.get<Product[]>(token, 'products')) ?? [];
      const data = since ? mergeById(prior, results[1].value) : results[1].value;
      setProducts(data); await fieldStore.set(token, 'products', data);
    }
    if (results[2].status === 'fulfilled') {
      const prior = (await fieldStore.get<FieldCustomer[]>(token, 'customers')) ?? [];
      const priorById = new Map(prior.map((customer) => [customer.id, customer]));
      const incoming = results[2].value.map((customer) => ({
        ...customer,
        premisesPhotoUrl: customer.premisesPhotoUrl ?? priorById.get(customer.id)?.premisesPhotoUrl ?? null,
      }));
      const data = since ? mergeById(prior, incoming) : incoming;
      setCustomers(data); await fieldStore.set(token, 'customers', data);
    }
    if (results[3].status === 'fulfilled') {
      setRegionTreks(results[3].value);
      await fieldStore.set(token, 'regionTreks', results[3].value);
    }
    if (results.some((result) => result.status === 'rejected')) {
      setError('The updated field control endpoints are not available on this backend. The assigned trek remains available.');
    } else {
      setError(null);
      await fieldStore.set(token, 'lastSyncedAt', started);
      setLastSyncedAt(started);
    }
    setLoading(false);
    setRefreshing(false);
  }, [token]);

  const syncProducts = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await fieldApi.getProducts(token);
      await fieldStore.set(token, 'products', data);
      setProducts(data);
      return data.length;
    } finally { setRefreshing(false); }
  }, [token]);

  const uploadCustomerPremisesPhoto = useCallback(async (customerId: string, file: File) => {
    const result = await fieldApi.uploadPremisesPhoto(token, customerId, file);
    resetTableData();
    const saved = (await fieldStore.get<FieldCustomer[]>(token, 'customers')) ?? [];
    const updated = saved.map((customer) => customer.id === customerId
      ? { ...customer, premisesPhotoUrl: result.premisesPhotoUrl }
      : customer);
    await fieldStore.set(token, 'customers', updated);
    setCustomers(updated);
    return result;
  }, [token]);

  const uploadCustomerPortrait = useCallback(async (customerId: string, personId: string, file: File) => {
    const result = await fieldApi.uploadCustomerPortrait(token, customerId, personId, file);
    resetTableData();
    const saved = (await fieldStore.get<FieldCustomer[]>(token, 'customers')) ?? [];
    const updated = saved.map((customer) => customer.id === customerId
      ? { ...customer, primaryPersonId: personId, portraitUrl: result.portraitUrl }
      : customer);
    await fieldStore.set(token, 'customers', updated);
    setCustomers(updated);
    return result;
  }, [token]);

  const processPhotoQueue = useCallback(async () => {
    if (!navigator.onLine) return;
    const [photos, actions, savedCustomers] = await Promise.all([
      fieldStore.photoQueue(token), fieldStore.queue(token), fieldStore.get<FieldCustomer[]>(token, 'customers'),
    ]);
    let next = [...photos];
    for (const photo of photos.filter((item) => item.status === 'pending')) {
      const customerAction = actions.find((action) => action.clientId === photo.customerClientId);
      if (!customerAction || customerAction.status === 'conflict') {
        next = next.map((item) => item.photoId === photo.photoId ? { ...item, status: 'conflict' as const, reason: customerAction?.reason || 'Customer registration conflicted.' } : item);
        continue;
      }
      if (!customerAction.serverId) continue;
      const customer = (savedCustomers ?? []).find((item) => item.id === customerAction.serverId);
      if (!customer) continue;
      try {
        if (photo.kind === 'premises') await fieldApi.uploadPremisesPhoto(token, customer.id, photo.file);
        else if (customer.primaryPersonId) await fieldApi.uploadCustomerPortrait(token, customer.id, customer.primaryPersonId, photo.file);
        else continue;
        next = next.map((item) => item.photoId === photo.photoId ? { ...item, status: 'uploaded' as const } : item);
      } catch (error) {
        next = next.map((item) => item.photoId === photo.photoId ? { ...item, reason: error instanceof Error ? error.message : 'Photo upload failed.' } : item);
      }
    }
    await fieldStore.setPhotoQueue(token, next);
    setPhotoQueue(next);
  }, [token]);

  const sync = useCallback(async () => {
    if (!token || !navigator.onLine || syncingRef.current || !controlAvailableRef.current) return;
    syncingRef.current = true; setSyncing(true);
    try {
      await mutationRef.current;
      let pending = (await fieldStore.queue(token)).filter((action) => action.status === 'pending').sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
      while (pending.length) {
        const batch = pending.slice(0, 199);
        const results = await fieldApi.sync(token, batch);
        if (results.length !== batch.length) throw new Error('Incomplete sync response');
        const byId = new Map(results.map((result) => [result.clientId, result]));
        mutationRef.current = mutationRef.current.then(async () => {
          const current = await fieldStore.queue(token);
          const next = current.map((action) => {
            const result = byId.get(action.clientId);
            if (!result) return action;
            return { ...action, status: result.status === 'Conflict' ? 'conflict' as const : 'synced' as const,
              serverId: result.serverId, reason: result.reason };
          });
          await fieldStore.setQueue(token, next); setQueue(next);
        });
        await mutationRef.current;
        if (results.some((result) => result.status !== 'Conflict')) resetTableData();
        pending = (await fieldStore.queue(token)).filter((action) => action.status === 'pending').sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
      }
      await refresh(true);
      await processPhotoQueue();
    } catch {
      setError('Sync could not finish. Your actions remain saved on this device.');
    } finally {
      syncingRef.current = false; setSyncing(false);
    }
  }, [token, refresh, processPhotoQueue]);

  const completeTrek = useCallback(async () => {
    if (!navigator.onLine) throw new Error('Connect to the internet before completing the trek.');
    if (!controlAvailableRef.current) throw new Error('The field control service is unavailable.');

    // The completion endpoint finalises the ledger, so flush queued work first.
    await sync();
    const [pendingActions, pendingPhotos] = await Promise.all([
      fieldStore.queue(token),
      fieldStore.photoQueue(token),
    ]);
    if (pendingActions.some((action) => action.status === 'pending') || pendingPhotos.some((photo) => photo.status === 'pending')) {
      throw new Error('Pending offline work could not be synced. Try Sync again before completing the trek.');
    }

    const completed = await fieldApi.completeTrek(token);
    setTrek(completed);
    await fieldStore.set(token, 'trek', completed);
    const savedRegionTreks = (await fieldStore.get<RegionTrek[]>(token, 'regionTreks')) ?? [];
    // Keep the in-memory list when the final sync response is temporarily
    // incomplete, then upsert the completed trek so the regional table never
    // disappears while the backend catches up.
    const currentRegionTreks = regionTreks.length ? regionTreks : savedRegionTreks;
    const completedSummary: RegionTrek = {
      trekId: completed.trekId,
      trekNumber: completed.trekNumber,
      scheduledDate: completed.scheduledDate,
      status: completed.status,
      driverName: completed.driverName,
      salesStaffName: completed.salesStaffName,
      regionName: completed.regionName,
      stopsCount: completed.stops.length,
    };
    const updatedRegionTreks = currentRegionTreks.some((item) => item.trekId === completed.trekId)
      ? currentRegionTreks.map((item) => item.trekId === completed.trekId ? { ...item, ...completedSummary } : item)
      : [...currentRegionTreks, completedSummary];
    setRegionTreks(updatedRegionTreks);
    await fieldStore.set(token, 'regionTreks', updatedRegionTreks);
    resetTableData();
    return completed;
  }, [token, sync, regionTreks]);

  useEffect(() => {
    let alive = true;
    if (!token) { setError('Invalid field link.'); setLoading(false); return; }
    (async () => {
      try {
        const [savedTrek, savedProducts, savedCustomers, savedRegionTreks, savedQueue, savedPhotos, savedSyncTime] = await Promise.all([
          fieldStore.get<DriverTrek>(token, 'trek'), fieldStore.get<Product[]>(token, 'products'),
          fieldStore.get<FieldCustomer[]>(token, 'customers'), fieldStore.get<RegionTrek[]>(token, 'regionTreks'),
          fieldStore.queue(token), fieldStore.photoQueue(token), fieldStore.get<string>(token, 'lastSyncedAt'),
        ]);
        if (!alive) return;
        if (savedTrek) setTrek(savedTrek);
        setProducts(savedProducts ?? []); setCustomers(savedCustomers ?? []);
        setRegionTreks(savedRegionTreks ?? []); setQueue(savedQueue); setPhotoQueue(savedPhotos ?? []);
        setLastSyncedAt(savedSyncTime ?? null);
        if (savedTrek) setLoading(false);
        if (navigator.onLine) { await refresh(true); await sync(); }
        else if (!savedTrek) { setError('Connect once to download this trek for offline use.'); setLoading(false); }
      } catch {
        if (alive) { setError('Local field data could not be opened.'); setLoading(false); }
      }
    })();
    const onOnline = () => { setOnline(true); void refresh(true).then(sync); };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline); window.addEventListener('offline', onOffline);
    return () => { alive = false; window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, [token, refresh, sync]);

  const enqueue = useCallback(async (type: ActionType, payload: Record<string, unknown>) => {
    const action: QueuedAction = { type, clientId: crypto.randomUUID(), occurredAt: new Date().toISOString(), payload, status: 'pending' };
    mutationRef.current = mutationRef.current.then(async () => {
      const next = [...await fieldStore.queue(token), action];
      await fieldStore.setQueue(token, next); setQueue(next);
    });
    await mutationRef.current;
    if (navigator.onLine) void sync();
    return action.clientId;
  }, [token, sync]);

  const queuePhoto = useCallback(async (customerClientId: string, kind: QueuedPhoto['kind'], file: File) => {
    const photo: QueuedPhoto = { photoId: crypto.randomUUID(), customerClientId, kind, file, status: 'pending' };
    const next = [...await fieldStore.photoQueue(token), photo];
    await fieldStore.setPhotoQueue(token, next);
    setPhotoQueue(next);
    if (navigator.onLine) void sync();
    return photo.photoId;
  }, [token, sync]);

  const retry = useCallback(async (clientId: string) => {
    const next = (await fieldStore.queue(token)).map((action) => action.clientId === clientId ? { ...action, status: 'pending' as const, reason: undefined } : action);
    await fieldStore.setQueue(token, next); setQueue(next); void sync();
  }, [token, sync]);

  const remove = useCallback(async (clientId: string) => {
    const next = (await fieldStore.queue(token)).filter((action) => action.clientId !== clientId);
    await fieldStore.setQueue(token, next); setQueue(next);
  }, [token]);

  return { trek, products, customers, regionTreks, queue, photoQueue, loading, syncing, refreshing, online, error, controlAvailable, lastSyncedAt, refresh, syncProducts, uploadCustomerPremisesPhoto, uploadCustomerPortrait, sync, completeTrek, enqueue, queuePhoto, retry, remove };
}

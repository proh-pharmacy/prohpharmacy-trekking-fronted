import { useCallback, useEffect, useRef, useState } from 'react';
import { resetTableData } from '../../../components/data-table';
import type { DriverTrek } from '../../../api-client/treks';
import type { Product } from '../../../api-client/products';
import { fieldApi, type ActionType, type FieldCustomer, type QueuedAction, type RegionTrek } from './api';
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
    } catch {
      setError('Sync could not finish. Your actions remain saved on this device.');
    } finally {
      syncingRef.current = false; setSyncing(false);
    }
  }, [token, refresh]);

  useEffect(() => {
    let alive = true;
    if (!token) { setError('Invalid field link.'); setLoading(false); return; }
    (async () => {
      try {
        const [savedTrek, savedProducts, savedCustomers, savedRegionTreks, savedQueue, savedSyncTime] = await Promise.all([
          fieldStore.get<DriverTrek>(token, 'trek'), fieldStore.get<Product[]>(token, 'products'),
          fieldStore.get<FieldCustomer[]>(token, 'customers'), fieldStore.get<RegionTrek[]>(token, 'regionTreks'),
          fieldStore.queue(token), fieldStore.get<string>(token, 'lastSyncedAt'),
        ]);
        if (!alive) return;
        if (savedTrek) setTrek(savedTrek);
        setProducts(savedProducts ?? []); setCustomers(savedCustomers ?? []);
        setRegionTreks(savedRegionTreks ?? []); setQueue(savedQueue);
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

  const retry = useCallback(async (clientId: string) => {
    const next = (await fieldStore.queue(token)).map((action) => action.clientId === clientId ? { ...action, status: 'pending' as const, reason: undefined } : action);
    await fieldStore.setQueue(token, next); setQueue(next); void sync();
  }, [token, sync]);

  const remove = useCallback(async (clientId: string) => {
    const next = (await fieldStore.queue(token)).filter((action) => action.clientId !== clientId);
    await fieldStore.setQueue(token, next); setQueue(next);
  }, [token]);

  return { trek, products, customers, regionTreks, queue, loading, syncing, refreshing, online, error, controlAvailable, lastSyncedAt, refresh, syncProducts, uploadCustomerPremisesPhoto, uploadCustomerPortrait, sync, enqueue, retry, remove };
}

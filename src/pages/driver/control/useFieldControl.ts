import { useCallback, useEffect, useRef, useState } from 'react';
import { resetTableData } from '../../../components/data-table';
import type { DriverTrek } from '../../../api-client/treks';
import type { Product } from '../../../api-client/products';
import { fieldApi, validateCustomerPhoto, type ActionType, type FieldCustomer, type FieldDistrict, type QueuedAction, type QueuedPhoto, type RegionTrek } from './api';
import { fieldStore } from './store';
import { addCachedLocation, applyCustomerUpdate, mergeCachedCustomer, registrationDetails, removeCachedLocation, restoreCachedLocation, updateCachedLocation } from './customerCache';

function mergeById<T extends { id: string }>(oldItems: T[], updates: T[]): T[] {
  const items = new Map(oldItems.map((item) => [item.id, item]));
  updates.forEach((item) => items.set(item.id, item));
  return [...items.values()];
}

export function useFieldControl(token: string) {
  const [trek, setTrek] = useState<DriverTrek | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<FieldCustomer[]>([]);
  const [districts, setDistricts] = useState<FieldDistrict[]>([]);
  const [regionTreks, setRegionTreks] = useState<RegionTrek[]>([]);
  const [assignedTreks, setAssignedTreks] = useState<RegionTrek[]>([]);
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [photoQueue, setPhotoQueue] = useState<QueuedPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingPhotoCount, setUploadingPhotoCount] = useState(0);
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
    // The timestamp is shared by all seeds. If one local table is empty,
    // fetch its full seed before applying deltas to it.
    const [cachedProducts, cachedCustomers, cachedDistricts, customerSeedVersion] = await Promise.all([
      fieldStore.get<Product[]>(token, 'products'),
      fieldStore.get<FieldCustomer[]>(token, 'customers'),
      fieldStore.get<FieldDistrict[]>(token, 'districts'),
      fieldStore.get<number>(token, 'customerSeedVersion'),
    ]);
    const productSince = cachedProducts?.length ? since : undefined;
    // Older installs hold the previous slim customer seed. Download the full
    // response once before using deltas so locations and representatives exist.
    const customerSince = cachedCustomers?.length && customerSeedVersion === 2 ? since : undefined;
    const districtSince = cachedDistricts?.length ? since : undefined;
    const started = new Date().toISOString();
    const results = await Promise.allSettled([
      fieldApi.getTrek(token), fieldApi.getProducts(token, productSince),
      fieldApi.getCustomers(token, customerSince), fieldApi.getDistricts(token, districtSince), fieldApi.getRegionTreks(token), fieldApi.getAssignedTreks(token),
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
      const data = productSince ? mergeById(prior, results[1].value) : results[1].value;
      setProducts(data); await fieldStore.set(token, 'products', data);
    }
    if (results[2].status === 'fulfilled') {
      const prior = (await fieldStore.get<FieldCustomer[]>(token, 'customers')) ?? [];
      const priorById = new Map(prior.map((customer) => [customer.id, customer]));
      const actions = await fieldStore.queue(token);
      const availableDistricts = results[3].status === 'fulfilled' ? results[3].value : cachedDistricts ?? [];
      const regionName = results[0].status === 'fulfilled' ? results[0].value.regionName : '';
      const registrations = actions.map((action) => registrationDetails(action, availableDistricts, regionName))
        .filter((customer): customer is FieldCustomer => customer !== null);
      const registrationById = new Map(registrations.map((customer) => [customer.id, customer]));
      const incoming = results[2].value.map((customer) =>
        mergeCachedCustomer(priorById.get(customer.id) ?? registrationById.get(customer.id), customer));
      let data = customerSince ? mergeById(prior, incoming) : incoming;
      for (const registered of registrations) {
        if (!data.some((customer) => customer.id === registered.id)) data.unshift(registered);
      }
      for (const action of actions.filter((item) => item.status === 'pending')) {
        if (action.type === 'UpdateCustomer') {
          data = data.map((customer) => customer.id === action.payload.customerId
            ? applyCustomerUpdate(customer, action.payload, availableDistricts) : customer);
        } else if (action.type === 'AddCustomerLocation') {
          data = data.map((customer) => {
            if (customer.id !== action.payload.customerId) return customer;
            if (customer.primaryLocation?.id === action.clientId || customer.additionalLocations?.some((location) => location.id === action.clientId)) return customer;
            return addCachedLocation(customer, action.payload, availableDistricts, action.clientId);
          });
        } else if (action.type === 'UpdateCustomerLocation') {
          const locationId = String(action.payload.locationId || action.payload.locationClientId || '');
          data = data.map((customer) => customer.primaryLocation?.id === locationId
            || customer.additionalLocations?.some((location) => location.id === locationId)
            ? updateCachedLocation(customer, locationId, action.payload, availableDistricts) : customer);
        }
      }
      setCustomers(data); await fieldStore.set(token, 'customers', data);
      await fieldStore.set(token, 'customerSeedVersion', 2);
    }
    if (results[3].status === 'fulfilled') {
      const prior = (await fieldStore.get<FieldDistrict[]>(token, 'districts')) ?? [];
      const data = districtSince ? mergeById(prior, results[3].value) : results[3].value;
      setDistricts(data); await fieldStore.set(token, 'districts', data);
    }
    if (results[4].status === 'fulfilled') {
      setRegionTreks(results[4].value);
      await fieldStore.set(token, 'regionTreks', results[4].value);
    }
    if (results[5].status === 'fulfilled') {
      setAssignedTreks(results[5].value);
      await fieldStore.set(token, 'assignedTreks', results[5].value);
    }
    const complete = results.every((result) => result.status === 'fulfilled');
    if (!complete) {
      setError('The updated field control endpoints are not available on this backend. The assigned trek remains available.');
    } else {
      setError(null);
      await fieldStore.set(token, 'lastSyncedAt', started);
      setLastSyncedAt(started);
    }
    setLoading(false);
    setRefreshing(false);
    return complete;
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
    setUploadingPhotoCount((count) => count + 1);
    try {
      const result = await fieldApi.uploadPremisesPhoto(token, customerId, file);
      resetTableData();
      const saved = (await fieldStore.get<FieldCustomer[]>(token, 'customers')) ?? [];
      const updated = saved.map((customer) => customer.id === customerId
        ? { ...customer, premisesPhotoUrl: result.premisesPhotoUrl }
        : customer);
      await fieldStore.set(token, 'customers', updated);
      setCustomers(updated);
      return result;
    } finally {
      setUploadingPhotoCount((count) => count - 1);
    }
  }, [token]);

  const uploadCustomerPortrait = useCallback(async (customerId: string, personId: string, file: File) => {
    setUploadingPhotoCount((count) => count + 1);
    try {
      const result = await fieldApi.uploadCustomerPortrait(token, customerId, personId, file);
      resetTableData();
      const saved = (await fieldStore.get<FieldCustomer[]>(token, 'customers')) ?? [];
      const updated = saved.map((customer) => customer.id === customerId
        ? { ...customer, primaryPersonId: personId, portraitUrl: result.portraitUrl,
          primaryPerson: customer.primaryPerson ? { ...customer.primaryPerson, id: personId, portraitUrl: result.portraitUrl } : customer.primaryPerson }
        : customer);
      await fieldStore.set(token, 'customers', updated);
      setCustomers(updated);
      return result;
    } finally {
      setUploadingPhotoCount((count) => count - 1);
    }
  }, [token]);

  const processPhotoQueue = useCallback(async () => {
    if (!navigator.onLine) return;
    const [photos, actions, savedCustomers] = await Promise.all([
      fieldStore.photoQueue(token), fieldStore.queue(token), fieldStore.get<FieldCustomer[]>(token, 'customers'),
    ]);
    let next = [...photos];
    let customersSnapshot = savedCustomers ?? [];
    let fullCustomersRefreshed = false;
    for (const photo of photos.filter((item) => item.status === 'pending')) {
      const customerAction = actions.find((action) => action.clientId === photo.customerClientId);
      if (!customerAction || customerAction.status === 'conflict') {
        next = next.map((item) => item.photoId === photo.photoId ? { ...item, status: 'conflict' as const, reason: customerAction?.reason || 'Customer registration conflicted.' } : item);
        continue;
      }
      if (!customerAction.serverId) {
        next = next.map((item) => item.photoId === photo.photoId ? { ...item, reason: 'Waiting for customer registration to finish.' } : item);
        continue;
      }
      if (photo.kind === 'portrait' && customerAction.personId === null) {
        next = next.map((item) => item.photoId === photo.photoId ? {
          ...item, status: 'conflict' as const,
          reason: 'No representative is registered for this customer. The portrait was not uploaded.',
        } : item);
        continue;
      }
      const customerId = customerAction.serverId;
      let customer = customersSnapshot.find((item) => item.id === customerAction.serverId);
      // Older sync responses may lack personId. The full customer seed is a fallback.
      if (photo.kind === 'portrait' && customerAction.personId === undefined
        && !customer?.primaryPersonId && !customer?.primaryPerson?.id && !fullCustomersRefreshed) {
        fullCustomersRefreshed = true;
        try {
          const downloaded = await fieldApi.getCustomers(token);
          const priorById = new Map(customersSnapshot.map((item) => [item.id, item]));
          customersSnapshot = mergeById(customersSnapshot,
            downloaded.map((item) => mergeCachedCustomer(priorById.get(item.id), item)));
          await fieldStore.set(token, 'customers', customersSnapshot);
          setCustomers(customersSnapshot);
          customer = customersSnapshot.find((item) => item.id === customerAction.serverId);
        } catch {
          // Keep the photo pending so the next sync can retry the lookup.
        }
      }
      try {
        validateCustomerPhoto(photo.file);
        if (photo.kind === 'premises') {
          const result = await fieldApi.uploadPremisesPhoto(token, customerId, photo.file);
          customersSnapshot = customersSnapshot.map((item) => item.id === customerId
            ? { ...item, premisesPhotoUrl: result.premisesPhotoUrl } : item);
        }
        else if (customerAction.personId || customer?.primaryPersonId || customer?.primaryPerson?.id) {
          const personId = customerAction.personId || customer?.primaryPersonId || customer?.primaryPerson?.id || '';
          const result = await fieldApi.uploadCustomerPortrait(token, customerId, personId, photo.file);
          customersSnapshot = customersSnapshot.map((item) => item.id === customerId
            ? { ...item, primaryPersonId: personId, portraitUrl: result.portraitUrl,
              primaryPerson: item.primaryPerson ? { ...item.primaryPerson, portraitUrl: result.portraitUrl } : item.primaryPerson } : item);
        }
        else {
          next = next.map((item) => item.photoId === photo.photoId ? { ...item, reason: 'Representative details are not available from the server yet. Try Sync again.' } : item);
          continue;
        }
        next = next.map((item) => item.photoId === photo.photoId ? { ...item, status: 'uploaded' as const } : item);
      } catch (error) {
        const response = (error as { response?: { data?: { detail?: string; message?: string } } })?.response?.data;
        const reason = response?.detail || response?.message || (error instanceof Error ? error.message : 'Photo upload failed.');
        next = next.map((item) => item.photoId === photo.photoId ? { ...item, reason: `Upload failed: ${reason}` } : item);
      }
    }
    await fieldStore.set(token, 'customers', customersSnapshot);
    setCustomers(customersSnapshot);
    await fieldStore.setPhotoQueue(token, next);
    setPhotoQueue(next);
  }, [token]);

  const sync = useCallback(async () => {
    if (!token || syncingRef.current) return;
    if (!navigator.onLine) {
      setError('Sync requires an internet connection.');
      return;
    }
    if (!controlAvailableRef.current) {
      setError('Sync is unavailable because the field sync endpoint is not responding.');
      return;
    }
    syncingRef.current = true; setSyncing(true);
    try {
      await mutationRef.current;
      let pending = (await fieldStore.queue(token)).filter((action) => action.status === 'pending').sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
      while (pending.length) {
        const batch = pending.slice(0, 199);
        const allActions = await fieldStore.queue(token);
        const batchIds = new Set(batch.map((action) => action.clientId));
        const invalidLocationUpdates = batch.filter((action) => {
          if (action.type !== 'UpdateCustomerLocation' || !action.payload.locationClientId) return false;
          const source = allActions.find((item) => item.type === 'AddCustomerLocation' && item.clientId === action.payload.locationClientId);
          return !batchIds.has(String(action.payload.locationClientId)) && (!source || source.status === 'conflict');
        });
        if (invalidLocationUpdates.length) {
          const invalidIds = new Set(invalidLocationUpdates.map((action) => action.clientId));
          const next = allActions.map((action) => invalidIds.has(action.clientId)
            ? { ...action, status: 'conflict' as const, reason: 'The location was not created. Remove or retry its add action first.' }
            : action);
          await fieldStore.setQueue(token, next); setQueue(next);
          pending = next.filter((action) => action.status === 'pending').sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
          continue;
        }
        const prepared = batch.map((action) => {
          if (action.type !== 'UpdateCustomerLocation' || !action.payload.locationClientId
            || batchIds.has(String(action.payload.locationClientId))) return action;
          const source = allActions.find((item) => item.type === 'AddCustomerLocation' && item.clientId === action.payload.locationClientId);
          if (!source?.serverId) throw new Error('The location must finish syncing before its update can be uploaded.');
          const { locationClientId: _locationClientId, ...rest } = action.payload;
          void _locationClientId;
          return { ...action, payload: { ...rest, locationId: source.serverId } };
        });
        const results = await fieldApi.sync(token, prepared);
        if (results.length !== batch.length) throw new Error('Incomplete sync response');
        const byId = new Map(results.map((result) => [result.clientId, result]));
        mutationRef.current = mutationRef.current.then(async () => {
          const current = await fieldStore.queue(token);
          const locationIds = new Map(current.filter((action) => action.type === 'AddCustomerLocation')
            .map((action) => [action.clientId, byId.get(action.clientId)?.status === 'Conflict' ? null : byId.get(action.clientId)?.serverId])
            .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0));
          const next = current.map((action) => {
            const result = byId.get(action.clientId);
            if (!result) {
              if (action.type === 'UpdateCustomerLocation' && action.payload.locationClientId
                && locationIds.has(String(action.payload.locationClientId))) {
                const { locationClientId: _locationClientId, ...rest } = action.payload;
                void _locationClientId;
                return { ...action, payload: { ...rest, locationId: locationIds.get(String(action.payload.locationClientId)) } };
              }
              return action;
            }
            return { ...action, status: result.status === 'Conflict' ? 'conflict' as const : 'synced' as const,
              serverId: result.serverId,
              ...(action.type === 'RegisterCustomer' && result.personId !== undefined ? { personId: result.personId } : {}),
              reason: result.reason };
          });
          await fieldStore.setQueue(token, next); setQueue(next);
          const registrations = next.filter((action) => action.type === 'RegisterCustomer' && action.status === 'synced' && action.serverId);
          if (locationIds.size || registrations.length) {
            const [saved, savedDistricts, savedTrek] = await Promise.all([
              fieldStore.get<FieldCustomer[]>(token, 'customers'),
              fieldStore.get<FieldDistrict[]>(token, 'districts'),
              fieldStore.get<DriverTrek>(token, 'trek'),
            ]);
            const registrationById = new Map(registrations.map((action) => [action.serverId!, action]));
            const updated: FieldCustomer[] = (saved ?? []).map((customer) => {
              const registration = registrationById.get(customer.id);
              const personId = registration?.personId;
              return {
                ...customer,
                ...(personId !== undefined ? {
                  primaryPersonId: personId,
                  primaryPerson: personId && customer.primaryPerson
                    ? { ...customer.primaryPerson, id: personId } : personId === null ? null : customer.primaryPerson,
                } : {}),
                primaryLocation: customer.primaryLocation?.id && locationIds.has(customer.primaryLocation.id)
                  ? { ...customer.primaryLocation, id: locationIds.get(customer.primaryLocation.id) } : customer.primaryLocation,
                additionalLocations: customer.additionalLocations?.map((location) => locationIds.has(location.id)
                  ? { ...location, id: locationIds.get(location.id)! } : location),
              };
            });
            for (const registration of registrations) {
              if (updated.some((customer) => customer.id === registration.serverId)) continue;
              const customer = registrationDetails(registration, savedDistricts ?? [], savedTrek?.regionName ?? '');
              if (customer) updated.unshift(customer);
            }
            await fieldStore.set(token, 'customers', updated); setCustomers(updated);
          }
        });
        await mutationRef.current;
        if (results.some((result) => result.status !== 'Conflict')) resetTableData();
        pending = (await fieldStore.queue(token)).filter((action) => action.status === 'pending').sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
      }
      await refresh(true);
      await processPhotoQueue();
    } catch (error) {
      const responseDetail = (error as { response?: { data?: { detail?: string; message?: string } } })?.response?.data;
      const reason = responseDetail?.detail || responseDetail?.message || (error instanceof Error ? error.message : 'The server could not process the queued actions.');
      const syncReason = `Sync failed: ${reason}`;
      const current = await fieldStore.queue(token);
      const next = current.map((action) => action.status === 'pending' ? { ...action, reason: syncReason } : action);
      await fieldStore.setQueue(token, next);
      setQueue(next);
      setError(syncReason);
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
        const [savedTrek, savedProducts, savedCustomers, savedDistricts, savedRegionTreks, savedAssignedTreks, savedQueue, savedPhotos, savedSyncTime] = await Promise.all([
          fieldStore.get<DriverTrek>(token, 'trek'), fieldStore.get<Product[]>(token, 'products'),
          fieldStore.get<FieldCustomer[]>(token, 'customers'), fieldStore.get<FieldDistrict[]>(token, 'districts'), fieldStore.get<RegionTrek[]>(token, 'regionTreks'), fieldStore.get<RegionTrek[]>(token, 'assignedTreks'),
          fieldStore.queue(token), fieldStore.photoQueue(token), fieldStore.get<string>(token, 'lastSyncedAt'),
        ]);
        if (!alive) return;
        if (savedTrek) setTrek(savedTrek);
        setProducts(savedProducts ?? []); setCustomers(savedCustomers ?? []);
        setDistricts(savedDistricts ?? []); setRegionTreks(savedRegionTreks ?? []); setAssignedTreks(savedAssignedTreks ?? []); setQueue(savedQueue); setPhotoQueue(savedPhotos ?? []);
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
      if (type === 'UpdateCustomerLocation') {
        const saved = (await fieldStore.get<FieldCustomer[]>(token, 'customers')) ?? [];
        const locationId = String(payload.locationId || payload.locationClientId || '');
        const location = saved.flatMap((customer) => [customer.primaryLocation, ...(customer.additionalLocations ?? [])])
          .find((item) => item?.id === locationId);
        if (location) action.localBeforeLocation = { ...location, id: locationId };
      }
      const current = await fieldStore.queue(token);
      // A planned stop product has one editable delivery outcome. Keep only
      // its latest unsynced save, unless an earlier save is being uploaded.
      const next = type === 'RecordDelivery' && !syncingRef.current
        ? [...current.filter((item) => !(item.type === 'RecordDelivery'
          && item.status !== 'synced'
          && item.payload.stopProductId === payload.stopProductId)), action]
        : [...current, action];
      await fieldStore.setQueue(token, next); setQueue(next);
      if (type === 'UpdateCustomer' || type === 'AddCustomerLocation' || type === 'UpdateCustomerLocation') {
        const [savedCustomers, savedDistricts] = await Promise.all([
          fieldStore.get<FieldCustomer[]>(token, 'customers'),
          fieldStore.get<FieldDistrict[]>(token, 'districts'),
        ]);
        const customerId = String(payload.customerId || '');
        const locationId = String(payload.locationId || payload.locationClientId || '');
        const updated = (savedCustomers ?? []).map((customer) => {
          if (type === 'UpdateCustomerLocation') {
            return customer.primaryLocation?.id === locationId || customer.additionalLocations?.some((location) => location.id === locationId)
              ? updateCachedLocation(customer, locationId, payload, savedDistricts ?? []) : customer;
          }
          if (customer.id !== customerId) return customer;
          return type === 'UpdateCustomer'
            ? applyCustomerUpdate(customer, payload, savedDistricts ?? [])
            : addCachedLocation(customer, payload, savedDistricts ?? [], action.clientId);
        });
        await fieldStore.set(token, 'customers', updated);
        setCustomers(updated);
      }
    });
    await mutationRef.current;
    if (navigator.onLine) void sync();
    return action.clientId;
  }, [token, sync]);

  const rememberCustomerLocation = useCallback(async (customerId: string, location: Record<string, unknown>) => {
    const [savedCustomers, savedDistricts] = await Promise.all([
      fieldStore.get<FieldCustomer[]>(token, 'customers'),
      fieldStore.get<FieldDistrict[]>(token, 'districts'),
    ]);
    const updated = (savedCustomers ?? []).map((customer) => customer.id === customerId
      ? addCachedLocation(customer, location, savedDistricts ?? [], String(location.id || crypto.randomUUID()))
      : customer);
    await fieldStore.set(token, 'customers', updated);
    setCustomers(updated);
  }, [token]);

  const queuePhoto = useCallback(async (customerClientId: string, kind: QueuedPhoto['kind'], file: File) => {
    validateCustomerPhoto(file);
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
    const current = await fieldStore.queue(token);
    const target = current.find((action) => action.clientId === clientId);
    const removedIds = new Set([clientId]);
    let foundDependent = true;
    while (foundDependent) {
      foundDependent = false;
      for (const action of current) {
        if (removedIds.has(action.clientId)) continue;
        const references = ['customerClientId', 'stopClientId', 'locationClientId', 'returnClientId'];
        if (references.some((field) => removedIds.has(String(action.payload[field] || '')))) {
          removedIds.add(action.clientId);
          foundDependent = true;
        }
      }
    }
    const next = current.filter((action) => !removedIds.has(action.clientId));
    await fieldStore.setQueue(token, next); setQueue(next);
    if (target?.type === 'AddCustomerLocation') {
      const saved = (await fieldStore.get<FieldCustomer[]>(token, 'customers')) ?? [];
      const updated = saved.map((customer) => customer.id === target.payload.customerId
        ? removeCachedLocation(customer, clientId) : customer);
      await fieldStore.set(token, 'customers', updated);
      setCustomers(updated);
    }
    if (target?.type === 'UpdateCustomerLocation' && target.localBeforeLocation) {
      const locationId = String(target.payload.locationId || target.payload.locationClientId || '');
      const [saved, savedDistricts] = await Promise.all([
        fieldStore.get<FieldCustomer[]>(token, 'customers'),
        fieldStore.get<FieldDistrict[]>(token, 'districts'),
      ]);
      const laterUpdates = next.filter((action) => action.type === 'UpdateCustomerLocation' && action.status === 'pending'
        && action.occurredAt > target.occurredAt
        && (action.payload.locationId === locationId || action.payload.locationClientId === locationId));
      const updated = (saved ?? []).map((customer) => {
        if (customer.primaryLocation?.id !== locationId && !customer.additionalLocations?.some((location) => location.id === locationId)) return customer;
        return laterUpdates.reduce((current, action) => updateCachedLocation(current, locationId, action.payload, savedDistricts ?? []),
          restoreCachedLocation(customer, locationId, target.localBeforeLocation!));
      });
      await fieldStore.set(token, 'customers', updated);
      setCustomers(updated);
    }
    if (target?.type === 'RegisterCustomer') {
      const photos = (await fieldStore.photoQueue(token)).filter((photo) => photo.customerClientId !== clientId);
      await fieldStore.setPhotoQueue(token, photos);
      setPhotoQueue(photos);
    }
  }, [token]);

  const removePhoto = useCallback(async (photoId: string) => {
    const next = (await fieldStore.photoQueue(token)).filter((photo) => photo.photoId !== photoId);
    await fieldStore.setPhotoQueue(token, next);
    setPhotoQueue(next);
  }, [token]);

  const retryPhoto = useCallback(async (photoId: string) => {
    const next = (await fieldStore.photoQueue(token)).map((photo) => photo.photoId === photoId
      ? { ...photo, status: 'pending' as const, reason: undefined }
      : photo);
    await fieldStore.setPhotoQueue(token, next);
    setPhotoQueue(next);
    if (navigator.onLine) await processPhotoQueue();
  }, [token, processPhotoQueue]);

  return { trek, products, customers, districts, regionTreks, assignedTreks, queue, photoQueue, loading, syncing, refreshing, uploadingPhotos: uploadingPhotoCount > 0, online, error, controlAvailable, lastSyncedAt, refresh, syncProducts, uploadCustomerPremisesPhoto, uploadCustomerPortrait, sync, completeTrek, enqueue, rememberCustomerLocation, queuePhoto, retry, remove, removePhoto, retryPhoto };
}

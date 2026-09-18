import { publicApi } from '../../../api-client/api';
import { treksApi, type DriverTrek, type DriverReturn } from '../../../api-client/treks';
import type { Product } from '../../../api-client/products';

export interface RegionTrek {
  trekId: string;
  trekNumber: string;
  scheduledDate: string;
  status: string;
  driverName: string;
  salesStaffName: string | null;
  regionName: string;
  stopsCount: number;
}

export interface FieldCustomer {
  id: string;
  customerCode?: string;
  businessName: string;
  primaryPhoneNumber: string;
  customerType?: string;
  primaryContactName?: string;
  primaryPersonId?: string | null;
  portraitUrl?: string | null;
  clientGeneratedId?: string;
  premisesPhotoUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracyMetres?: number | null;
  primaryLocation?: { latitude?: number | null; longitude?: number | null; accuracyMetres?: number | null } | null;
}

export interface GpsFix {
  latitude: number;
  longitude: number;
  accuracyMetres: number;
}

export interface DriverDevice {
  deviceId: string;
  deviceName: string;
  traccarUniqueId: string;
  lastLatitude: number | null;
  lastLongitude: number | null;
  lastAddress: string | null;
  lastReportedAt: string | null;
  batteryLevel: number | null;
  speed: number | null;
  motion: boolean | null;
  ignition: boolean | null;
  traccarStatus: string | null;
}

export interface DriverLocation {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  speed?: number | null;
  bearing?: number | null;
  accuracy?: number | null;
  batteryLevel?: number | null;
  recordedAt: string;
}

export type ActionType =
  | 'RegisterCustomer'
  | 'AddWalkInStop'
  | 'RecordDelivery'
  | 'RecordUnplannedSale'
  | 'RecordReturn'
  | 'VoidReturn';

export interface QueuedAction {
  type: ActionType;
  clientId: string;
  occurredAt: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'conflict' | 'synced';
  serverId?: string | null;
  reason?: string;
}

export type QueuedPhotoKind = 'premises' | 'portrait';
export interface QueuedPhoto {
  photoId: string;
  customerClientId: string;
  kind: QueuedPhotoKind;
  file: File;
  status: 'pending' | 'uploaded' | 'conflict';
  reason?: string;
}

export interface SyncResult {
  clientId: string;
  type: ActionType;
  status: 'Created' | 'AlreadySynced' | 'Conflict';
  serverId: string | null;
  reason?: string;
}

const path = (token: string, suffix: string) => `/treks/driver/${encodeURIComponent(token)}${suffix}`;
const unwrapList = <T>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') {
    const data = (value as { data?: unknown; items?: unknown }).data ?? (value as { items?: unknown }).items;
    if (Array.isArray(data)) return data as T[];
  }
  return [];
};

export const fieldApi = {
  getDevice: async (token: string): Promise<DriverDevice> => {
    const response = await publicApi.get<DriverDevice>(path(token, '/device'));
    return response.data;
  },
  reportLocation: async (token: string, location: DriverLocation): Promise<void> => {
    await publicApi.post(path(token, '/location'), {
      latitude: location.latitude, longitude: location.longitude,
      altitude: location.altitude ?? null, speed: location.speed ?? null,
      bearing: location.bearing ?? null, accuracy: location.accuracy ?? null,
      batteryLevel: location.batteryLevel ?? null,
    });
  },
  sendSos: async (token: string, location: DriverLocation): Promise<void> => {
    await publicApi.post(path(token, '/sos'), {
      latitude: location.latitude, longitude: location.longitude,
      altitude: location.altitude ?? null, accuracy: location.accuracy ?? null,
    });
  },
  getRegionTreks: async (token: string): Promise<RegionTrek[]> => {
    const response = await publicApi.get(path(token, '/region/treks'));
    return unwrapList<RegionTrek>(response.data);
  },
  getProducts: async (token: string, since?: string): Promise<Product[]> => {
    const response = await publicApi.get(path(token, '/offline/products'), { params: since ? { since } : undefined });
    return unwrapList<Product>(response.data);
  },
  getCustomers: async (token: string, since?: string): Promise<FieldCustomer[]> => {
    const response = await publicApi.get(path(token, '/offline/customers'), { params: since ? { since } : undefined });
    return unwrapList<FieldCustomer>(response.data).map((customer) => ({
      ...customer,
      id: customer.id || (customer as FieldCustomer & { customerAccountId?: string }).customerAccountId || '',
      primaryPersonId: customer.primaryPersonId
        || (customer as FieldCustomer & { personId?: string; primaryPerson?: { id?: string } }).personId
        || (customer as FieldCustomer & { primaryPerson?: { id?: string } }).primaryPerson?.id
        || null,
      portraitUrl: customer.portraitUrl
        || (customer as FieldCustomer & { primaryContactPortraitUrl?: string; primaryPerson?: { portraitUrl?: string } }).primaryContactPortraitUrl
        || (customer as FieldCustomer & { primaryPerson?: { portraitUrl?: string } }).primaryPerson?.portraitUrl
        || null,
    }));
  },
  uploadPremisesPhoto: async (token: string, customerId: string, file: File): Promise<{ customerId: string; premisesPhotoUrl: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await publicApi.post<{ customerId: string; premisesPhotoUrl: string }>(
      path(token, `/customers/${encodeURIComponent(customerId)}/premises-photo`),
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },
  uploadCustomerPortrait: async (token: string, customerId: string, personId: string, file: File): Promise<{ personId: string; portraitUrl: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await publicApi.post<{ personId: string; portraitUrl: string }>(
      path(token, `/customers/${encodeURIComponent(customerId)}/people/${encodeURIComponent(personId)}/portrait`),
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },
  getTrek: async (token: string): Promise<DriverTrek> => {
    const response = await publicApi.get<DriverTrek>(path(token, '/offline/trek'));
    return response.data;
  },
  completeTrek: async (token: string): Promise<DriverTrek> => {
    const response = await publicApi.post<DriverTrek>(path(token, '/complete'));
    return response.data;
  },
  getLegacyTrek: (token: string) => treksApi.getByDriverToken(token),
  sync: async (token: string, actions: QueuedAction[]): Promise<SyncResult[]> => {
    const response = await publicApi.post<{ results: SyncResult[] }>(path(token, '/sync'), {
      actions: actions.map(({ type, clientId, occurredAt, payload }) => ({ type, clientId, occurredAt, payload })),
    });
    return response.data.results;
  },
  registerCustomer: async (token: string, payload: Record<string, unknown>): Promise<FieldCustomer> => {
    const response = await publicApi.post<FieldCustomer>(path(token, '/customers'), payload);
    return response.data;
  },
  addWalkInStop: async (token: string, trekId: string, payload: Record<string, unknown>) => {
    const response = await publicApi.post(path(token, `/treks/${trekId}/stops`), payload);
    return response.data;
  },
  recordUnplannedSale: async (token: string, stopId: string, payload: Record<string, unknown>) => {
    const response = await publicApi.post(path(token, `/stops/${stopId}/products/unplanned`), payload);
    return response.data;
  },
  recordReturn: async (token: string, stopId: string, payload: Record<string, unknown>): Promise<DriverReturn> => {
    const response = await publicApi.post<DriverReturn>(path(token, `/stops/${stopId}/returns`), payload);
    return response.data;
  },
  voidReturn: async (token: string, stopId: string, returnId: string) => {
    await publicApi.delete(path(token, `/stops/${stopId}/returns/${returnId}`));
  },
};

export function captureGps(): Promise<GpsFix | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMetres: position.coords.accuracy,
      }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}

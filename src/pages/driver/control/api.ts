import { baseURL, publicApi } from '../../../api-client/api';
import { treksApi, type DriverTrek, type DriverReturn } from '../../../api-client/treks';
import type { Product } from '../../../api-client/products';
import type { CustomerPerson } from '../../../api-client/customers';

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
export interface FieldDistrict { id: string; name: string; code: string; regionId: string; }

export interface FieldCustomer {
  id: string;
  customerCode?: string;
  businessName: string;
  primaryPhoneNumber: string;
  customerType?: string;
  registrationStatus?: string;
  createdAt?: string | null;
  recordedAt?: string | null;
  regionId?: string | null;
  regionName?: string | null;
  primaryPerson?: CustomerPerson | null;
  primaryContactName?: string;
  primaryPersonId?: string | null;
  tradingName?: string | null;
  whatsAppNumber?: string | null;
  primaryContactFirstName?: string | null;
  primaryContactMiddleName?: string | null;
  primaryContactLastName?: string | null;
  primaryContactPhone?: string | null;
  primaryContactRelationshipType?: string | null;
  primaryContactGhanaCardNumber?: string | null;
  portraitUrl?: string | null;
  clientGeneratedId?: string;
  premisesPhotoUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracyMetres?: number | null;
  districtId?: string | null;
  streetAddress?: string | null;
  landmarkAndDirections?: string | null;
  primaryLocation?: { id?: string; locationType?: string | null; regionId?: string | null; regionName?: string | null; districtId?: string | null; districtName?: string | null; streetAddress?: string | null; landmarkAndDirections?: string | null; latitude?: number | null; longitude?: number | null; accuracyMetres?: number | null; captureMethod?: string | null; verificationStatus?: string | null; isPrimary?: boolean } | null;
  locations?: FieldCustomerLocation[];
  additionalLocations?: FieldCustomerLocation[];
}

export interface FieldCustomerLocation {
  id: string;
  locationType?: string | null;
  regionId?: string | null;
  regionName?: string | null;
  districtId?: string | null;
  districtName?: string | null;
  streetAddress?: string | null;
  landmarkAndDirections?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracyMetres?: number | null;
  captureMethod?: string | null;
  verificationStatus?: string | null;
  isPrimary?: boolean;
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

export type StopPriceOverrides = Record<string, Record<string, { basicUnitPrice: number; packagingUnitPrice: number | null }>>;

export type ActionType =
  | 'RegisterCustomer'
  | 'UpdateCustomer'
  | 'AddCustomerLocation'
  | 'UpdateCustomerLocation'
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
  personId?: string | null;
  reason?: string;
  localBeforeLocation?: FieldCustomerLocation;
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
  personId?: string | null;
  reason?: string;
}

const path = (token: string, suffix: string) => `/treks/driver/${encodeURIComponent(token)}${suffix}`;
const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function validateCustomerPhoto(file: File): void {
  if (!(file instanceof Blob) || file.size === 0) throw new Error('Choose a non-empty photo.');
  if (!PHOTO_TYPES.has(file.type)) throw new Error('Choose a JPEG, PNG, or WebP photo.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Photo must be 5 MB or smaller.');
}

async function uploadDriverPhoto<T>(token: string, suffix: string, file: File): Promise<T> {
  validateCustomerPhoto(file);
  console.groupCollapsed(`[Driver photo upload] ${suffix}`);
  console.table({
    stage: 'before serialization',
    name: file.name || '(unnamed)',
    type: file.type || '(unknown)',
    sizeBytes: file.size,
    isFile: file instanceof File,
    isBlob: file instanceof Blob,
  });
  // WebKit can send an IndexedDB-restored File as an empty multipart body.
  // Reading it first gives FormData an in-memory Blob it can upload reliably.
  const bytes = await file.arrayBuffer();
  console.table({ stage: 'after arrayBuffer', sizeBytes: bytes.byteLength, matchesFileSize: bytes.byteLength === file.size });
  if (bytes.byteLength !== file.size) {
    console.groupEnd();
    throw new Error('The saved photo could not be read. Choose the photo again.');
  }
  const formData = new FormData();
  const uploadBlob = new Blob([bytes], { type: file.type });
  formData.append('file', uploadBlob, file.name || 'photo');
  const formValue = formData.get('file');
  console.table({
    stage: 'formData ready',
    fieldName: 'file',
    formValuePresent: formValue !== null,
    formValueIsBlob: formValue instanceof Blob,
    formValueSizeBytes: formValue instanceof Blob ? formValue.size : 0,
    formValueType: formValue instanceof Blob ? formValue.type : '(missing)',
  });
  console.groupEnd();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30000);
  let response: Response;
  try {
    response = await fetch(`${baseURL}${path(token, suffix)}`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: formData,
      signal: controller.signal,
    });
    console.info('[Driver photo upload] response', { suffix, status: response.status, ok: response.ok });
  } catch (error) {
    console.error('[Driver photo upload] request error', { suffix, error });
    if (controller.signal.aborted) throw new Error('Photo upload timed out. Try again.');
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
  if (!response.ok) {
    const problem = await response.json().catch(() => null) as {
      detail?: string;
      message?: string;
      title?: string;
      errors?: Record<string, string[]>;
    } | null;
    console.error('[Driver photo upload] server rejected upload', { suffix, status: response.status, problem });
    const fieldError = problem?.errors && Object.values(problem.errors).flat().join(' ');
    throw new Error(problem?.detail || problem?.message || fieldError || problem?.title || `Photo upload failed (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

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
  getAssignedTreks: async (token: string): Promise<RegionTrek[]> => {
    const response = await publicApi.get(path(token, '/assigned'));
    return unwrapList<RegionTrek>(response.data);
  },
  generateTrekToken: async (token: string, trekId: string): Promise<{ token: string; url: string }> => {
    const response = await publicApi.post<{ token: string; url: string }>(path(token, `/treks/${encodeURIComponent(trekId)}/generate-token`));
    return response.data;
  },
  getProducts: async (token: string, since?: string): Promise<{ products: Product[]; stopPriceOverrides: StopPriceOverrides }> => {
    const response = await publicApi.get(path(token, '/offline/products'), { params: since ? { since } : undefined });
    const data = response.data;
    if (Array.isArray(data)) return { products: data as Product[], stopPriceOverrides: {} };
    return {
      products: unwrapList<Product>((data as { products?: unknown }).products ?? data),
      stopPriceOverrides: (data as { stopPriceOverrides?: StopPriceOverrides }).stopPriceOverrides ?? {},
    };
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
      primaryContactName: customer.primaryPerson?.fullName || customer.primaryContactName,
      primaryContactPhone: customer.primaryPerson?.primaryPhoneNumber || customer.primaryContactPhone,
      primaryContactRelationshipType: customer.primaryPerson?.relationshipType || customer.primaryContactRelationshipType,
      latitude: customer.primaryLocation?.latitude ?? customer.latitude ?? null,
      longitude: customer.primaryLocation?.longitude ?? customer.longitude ?? null,
      accuracyMetres: customer.primaryLocation?.accuracyMetres ?? customer.accuracyMetres ?? null,
      districtId: customer.primaryLocation?.districtId ?? customer.districtId ?? null,
      streetAddress: customer.primaryLocation?.streetAddress ?? customer.streetAddress ?? null,
      landmarkAndDirections: customer.primaryLocation?.landmarkAndDirections ?? customer.landmarkAndDirections ?? null,
    }));
  },
  getDistricts: async (token: string, since?: string): Promise<FieldDistrict[]> => {
    const response = await publicApi.get(path(token, '/offline/districts'), { params: since ? { since } : undefined });
    return unwrapList<FieldDistrict>(response.data);
  },
  uploadPremisesPhoto: async (token: string, customerId: string, file: File): Promise<{ customerId: string; premisesPhotoUrl: string }> => {
    return uploadDriverPhoto<{ customerId: string; premisesPhotoUrl: string }>(
      token, `/customers/${encodeURIComponent(customerId)}/premises-photo`, file
    );
  },
  uploadCustomerPortrait: async (token: string, customerId: string, personId: string, file: File): Promise<{ personId: string; portraitUrl: string }> => {
    return uploadDriverPhoto<{ personId: string; portraitUrl: string }>(
      token, `/customers/${encodeURIComponent(customerId)}/people/${encodeURIComponent(personId)}/portrait`, file
    );
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
  addCustomerLocation: async (token: string, customerId: string, payload: Record<string, unknown>) => {
    const response = await publicApi.post(path(token, `/customers/${encodeURIComponent(customerId)}/locations`), payload);
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

import type { FieldCustomer, FieldCustomerLocation, FieldDistrict, QueuedAction } from './api';

const asText = (value: unknown) => typeof value === 'string' ? value : undefined;
const asNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : undefined;

// The offline customer seed is intentionally slim. Keep details collected on
// this device when a later seed refresh only supplies account summary fields.
export function mergeCachedCustomer(previous: FieldCustomer | undefined, incoming: FieldCustomer): FieldCustomer {
  const customer: FieldCustomer = {
    ...previous,
    ...incoming,
    premisesPhotoUrl: incoming.premisesPhotoUrl ?? previous?.premisesPhotoUrl ?? null,
    portraitUrl: incoming.portraitUrl ?? previous?.portraitUrl ?? null,
    primaryPersonId: incoming.primaryPersonId ?? previous?.primaryPersonId ?? null,
    primaryPerson: incoming.primaryPerson ?? previous?.primaryPerson ?? null,
  };
  const flatLocation = ['districtId', 'streetAddress', 'landmarkAndDirections', 'latitude', 'longitude', 'accuracyMetres']
    .some((field) => Object.prototype.hasOwnProperty.call(incoming, field));
  if (incoming.primaryLocation || previous?.primaryLocation || flatLocation) {
    customer.primaryLocation = {
      ...previous?.primaryLocation,
      ...incoming.primaryLocation,
      ...(incoming.districtId !== undefined ? { districtId: incoming.districtId } : {}),
      ...(incoming.streetAddress !== undefined ? { streetAddress: incoming.streetAddress } : {}),
      ...(incoming.landmarkAndDirections !== undefined ? { landmarkAndDirections: incoming.landmarkAndDirections } : {}),
      ...(incoming.latitude !== undefined ? { latitude: incoming.latitude } : {}),
      ...(incoming.longitude !== undefined ? { longitude: incoming.longitude } : {}),
      ...(incoming.accuracyMetres !== undefined ? { accuracyMetres: incoming.accuracyMetres } : {}),
    };
  }
  return customer;
}

export function registrationDetails(action: QueuedAction, districts: FieldDistrict[], regionName: string): FieldCustomer | null {
  if (action.type !== 'RegisterCustomer' || !action.serverId) return null;
  const payload = action.payload;
  const representative = (payload.representative ?? {}) as Record<string, unknown>;
  const gps = (payload.gps ?? {}) as Record<string, unknown>;
  const districtId = asText(payload.districtId);
  const district = districts.find((item) => item.id === districtId);
  const hasLocation = Boolean(districtId || payload.streetAddress || payload.landmarkAndDirections || asNumber(gps.latitude) !== undefined);
  return {
    id: action.serverId,
    clientGeneratedId: action.clientId,
    businessName: asText(payload.businessName) || '',
    customerType: asText(payload.customerType),
    primaryPhoneNumber: asText(payload.primaryPhoneNumber) || '',
    tradingName: asText(payload.tradingName),
    whatsAppNumber: asText(payload.whatsAppNumber),
    regionName,
    primaryContactFirstName: asText(representative.firstName),
    primaryContactMiddleName: asText(representative.middleName),
    primaryContactLastName: asText(representative.lastName),
    primaryContactName: [representative.firstName, representative.middleName, representative.lastName].filter(Boolean).join(' '),
    primaryContactPhone: asText(representative.primaryPhoneNumber),
    primaryContactRelationshipType: asText(representative.relationshipType),
    primaryContactGhanaCardNumber: asText(representative.ghanaCardNumber),
    primaryPersonId: action.personId ?? null,
    districtId,
    streetAddress: asText(payload.streetAddress),
    landmarkAndDirections: asText(payload.landmarkAndDirections),
    latitude: asNumber(gps.latitude),
    longitude: asNumber(gps.longitude),
    accuracyMetres: asNumber(gps.accuracyMetres),
    primaryLocation: hasLocation ? {
      districtId,
      districtName: district?.name,
      regionId: district?.regionId,
      regionName,
      streetAddress: asText(payload.streetAddress),
      landmarkAndDirections: asText(payload.landmarkAndDirections),
      latitude: asNumber(gps.latitude),
      longitude: asNumber(gps.longitude),
      accuracyMetres: asNumber(gps.accuracyMetres),
      isPrimary: true,
    } : null,
    additionalLocations: [],
  };
}

export function applyCustomerUpdate(customer: FieldCustomer, payload: Record<string, unknown>, districts: FieldDistrict[]): FieldCustomer {
  const representative = payload.representative && typeof payload.representative === 'object'
    ? payload.representative as Record<string, unknown> : null;
  const gps = payload.gps && typeof payload.gps === 'object' ? payload.gps as Record<string, unknown> : null;
  const districtId = asText(payload.districtId);
  const district = districts.find((item) => item.id === districtId);
  const updated: FieldCustomer = { ...customer };
  for (const field of ['businessName', 'tradingName', 'customerType', 'primaryPhoneNumber', 'whatsAppNumber'] as const) {
    if (field in payload) (updated as unknown as Record<string, unknown>)[field] = payload[field];
  }
  if (representative) {
    if ('firstName' in representative) updated.primaryContactFirstName = asText(representative.firstName);
    if ('middleName' in representative) updated.primaryContactMiddleName = asText(representative.middleName);
    if ('lastName' in representative) updated.primaryContactLastName = asText(representative.lastName);
    if ('primaryPhoneNumber' in representative) updated.primaryContactPhone = asText(representative.primaryPhoneNumber);
    if ('relationshipType' in representative) updated.primaryContactRelationshipType = asText(representative.relationshipType);
    if ('ghanaCardNumber' in representative) updated.primaryContactGhanaCardNumber = asText(representative.ghanaCardNumber);
    updated.primaryContactName = [updated.primaryContactFirstName, updated.primaryContactMiddleName, updated.primaryContactLastName].filter(Boolean).join(' ');
    updated.primaryPerson = {
      id: customer.primaryPerson?.id || customer.primaryPersonId || '',
      fullName: updated.primaryContactName,
      relationshipType: (updated.primaryContactRelationshipType || 'Owner') as NonNullable<FieldCustomer['primaryPerson']>['relationshipType'],
      primaryPhoneNumber: updated.primaryContactPhone || '',
      isPrimaryContact: customer.primaryPerson?.isPrimaryContact ?? true,
      isCreditResponsiblePerson: customer.primaryPerson?.isCreditResponsiblePerson ?? false,
      portraitUrl: customer.primaryPerson?.portraitUrl,
    };
  }
  if (districtId !== undefined) updated.districtId = districtId;
  if ('streetAddress' in payload) updated.streetAddress = asText(payload.streetAddress);
  if ('landmarkAndDirections' in payload) updated.landmarkAndDirections = asText(payload.landmarkAndDirections);
  if (gps) {
    updated.latitude = asNumber(gps.latitude);
    updated.longitude = asNumber(gps.longitude);
    updated.accuracyMetres = asNumber(gps.accuracyMetres);
  }
  if (districtId !== undefined || 'streetAddress' in payload || 'landmarkAndDirections' in payload || gps) {
    updated.primaryLocation = {
      ...customer.primaryLocation,
      ...(districtId !== undefined ? { districtId, districtName: district?.name, regionId: district?.regionId } : {}),
      ...('streetAddress' in payload ? { streetAddress: asText(payload.streetAddress) } : {}),
      ...('landmarkAndDirections' in payload ? { landmarkAndDirections: asText(payload.landmarkAndDirections) } : {}),
      ...(gps ? { latitude: updated.latitude, longitude: updated.longitude, accuracyMetres: updated.accuracyMetres } : {}),
      isPrimary: true,
    };
  }
  return updated;
}

export function addCachedLocation(customer: FieldCustomer, payload: Record<string, unknown>, districts: FieldDistrict[], locationId: string): FieldCustomer {
  const gps = payload.gps && typeof payload.gps === 'object' ? payload.gps as Record<string, unknown> : null;
  const districtId = asText(payload.districtId);
  const district = districts.find((item) => item.id === districtId);
  const location: FieldCustomerLocation = {
    id: locationId,
    locationType: asText(payload.locationType) || 'BusinessPremises',
    regionId: district?.regionId,
    regionName: customer.regionName,
    districtId,
    districtName: district?.name,
    streetAddress: asText(payload.streetAddress),
    landmarkAndDirections: asText(payload.landmarkAndDirections),
    latitude: asNumber(payload.latitude) ?? asNumber(gps?.latitude),
    longitude: asNumber(payload.longitude) ?? asNumber(gps?.longitude),
    accuracyMetres: asNumber(payload.accuracyMetres) ?? asNumber(gps?.accuracyMetres),
    isPrimary: Boolean(payload.isPrimary),
  };
  if (location.isPrimary) {
    const oldPrimary = customer.primaryLocation;
    return {
      ...customer,
      primaryLocation: location,
      additionalLocations: [
        ...(oldPrimary ? [{ ...oldPrimary, id: oldPrimary.id || `primary:${customer.id}`, isPrimary: false }] : []),
        ...(customer.additionalLocations ?? customer.locations ?? []).map((item) => ({ ...item, isPrimary: false })),
      ],
      latitude: location.latitude,
      longitude: location.longitude,
      accuracyMetres: location.accuracyMetres,
      districtId: location.districtId,
      streetAddress: location.streetAddress,
      landmarkAndDirections: location.landmarkAndDirections,
    };
  }
  const existing = customer.additionalLocations ?? customer.locations ?? [];
  return { ...customer, additionalLocations: [...existing.filter((item) => item.id !== location.id), location] };
}

export function removeCachedLocation(customer: FieldCustomer, locationId: string): FieldCustomer {
  const additional = customer.additionalLocations ?? customer.locations ?? [];
  if (customer.primaryLocation?.id !== locationId) {
    return { ...customer, additionalLocations: additional.filter((location) => location.id !== locationId) };
  }
  const [restored, ...remaining] = additional;
  return {
    ...customer,
    primaryLocation: restored ? { ...restored, isPrimary: true } : null,
    additionalLocations: remaining,
    districtId: restored?.districtId ?? null,
    streetAddress: restored?.streetAddress ?? null,
    landmarkAndDirections: restored?.landmarkAndDirections ?? null,
    latitude: restored?.latitude ?? null,
    longitude: restored?.longitude ?? null,
    accuracyMetres: restored?.accuracyMetres ?? null,
  };
}

export function updateCachedLocation(customer: FieldCustomer, locationId: string, payload: Record<string, unknown>, districts: FieldDistrict[]): FieldCustomer {
  const gps = payload.gps && typeof payload.gps === 'object' ? payload.gps as Record<string, unknown> : null;
  const districtId = asText(payload.districtId);
  const district = districts.find((item) => item.id === districtId);
  const update = (location: NonNullable<FieldCustomer['primaryLocation']>) => ({
    ...location,
    ...(districtId !== undefined ? { districtId, districtName: district?.name ?? location.districtName, regionId: district?.regionId ?? location.regionId } : {}),
    ...('streetAddress' in payload ? { streetAddress: asText(payload.streetAddress) ?? '' } : {}),
    ...('landmarkAndDirections' in payload ? { landmarkAndDirections: asText(payload.landmarkAndDirections) ?? '' } : {}),
    ...(gps ? {
      latitude: asNumber(gps.latitude) ?? location.latitude,
      longitude: asNumber(gps.longitude) ?? location.longitude,
      accuracyMetres: asNumber(gps.accuracyMetres) ?? location.accuracyMetres,
      captureMethod: 'PwaGps', verificationStatus: 'GpsCaptured',
    } : {}),
  });
  if (customer.primaryLocation?.id === locationId) {
    const primaryLocation = update(customer.primaryLocation);
    return { ...customer, primaryLocation,
      districtId: primaryLocation.districtId, streetAddress: primaryLocation.streetAddress,
      landmarkAndDirections: primaryLocation.landmarkAndDirections,
      latitude: primaryLocation.latitude, longitude: primaryLocation.longitude, accuracyMetres: primaryLocation.accuracyMetres };
  }
  return { ...customer, additionalLocations: (customer.additionalLocations ?? customer.locations ?? [])
    .map((location) => location.id === locationId ? update(location) as FieldCustomerLocation : location) };
}

export function restoreCachedLocation(customer: FieldCustomer, locationId: string, before: FieldCustomerLocation): FieldCustomer {
  const restored = { ...before, id: locationId };
  if (customer.primaryLocation?.id === locationId) {
    return { ...customer, primaryLocation: restored,
      districtId: restored.districtId, streetAddress: restored.streetAddress,
      landmarkAndDirections: restored.landmarkAndDirections,
      latitude: restored.latitude, longitude: restored.longitude, accuracyMetres: restored.accuracyMetres };
  }
  return { ...customer, additionalLocations: (customer.additionalLocations ?? customer.locations ?? [])
    .map((location) => location.id === locationId ? restored : location) };
}

import apiClient from './api';

// ── Enums ──────────────────────────────────────────────────────────────
export type CustomerType =
  | 'RetailPharmacy'
  | 'WholesalePharmacy'
  | 'OTCMedicineSeller'
  | 'Clinic'
  | 'Hospital'
  | 'ChemicalShop'
  | 'LicensedHealthFacility'
  | 'Other';

export type RelationshipType =
  | 'Owner'
  | 'Proprietor'
  | 'Director'
  | 'Manager'
  | 'PrimaryContact'
  | 'CreditResponsiblePerson'
  | 'Guarantor'
  | 'Other';

export type RegistrationStatus =
  | 'Draft'
  | 'PendingReview'
  | 'Active'
  | 'Rejected'
  | 'Suspended'
  | 'Inactive';

export type LocationType =
  | 'BusinessPremises'
  | 'DeliveryLocation'
  | 'Residential'
  | 'Other';

// ── Response types ─────────────────────────────────────────────────────
export interface CustomerPerson {
  id: string;
  fullName: string;
  relationshipType: RelationshipType;
  primaryPhoneNumber: string;
  isPrimaryContact: boolean;
  isCreditResponsiblePerson: boolean;
  portraitUrl?: string;
}

export interface CustomerLocation {
  id: string;
  latitude: number;
  longitude: number;
  accuracyMetres: number;
  landmarkAndDirections: string;
  streetAddress: string;
  regionName: string;
  districtName: string;
  captureMethod: string;
  verificationStatus: string;
  isPrimary: boolean;
}

export interface Customer {
  id: string;
  customerCode: string;
  businessName: string;
  tradingName?: string;
  customerType: CustomerType;
  registrationStatus: RegistrationStatus;
  primaryPhoneNumber: string;
  whatsAppNumber?: string;
  regionId: string;
  regionName: string;
  owningBranchId?: string;
  owningBranchName?: string;
  registeredByStaffId?: string;
  registeredByName?: string;
  registeredDuringTrekId?: string | null;
  createdOffline?: boolean;
  recordedAt?: string;
  createdAt: string;
  updatedAt?: string | null;
  primaryPerson?: CustomerPerson;
  primaryLocation?: CustomerLocation;
}

// ── Request payloads ───────────────────────────────────────────────────
export interface CreateCustomerPayload {
  businessName: string;
  tradingName?: string;
  customerType: CustomerType;
  regionId: string;
  primaryPhoneNumber: string;
  whatsAppNumber?: string;
  registeredDuringTrekId?: string | null;
  representative: {
    firstName: string;
    middleName?: string | null;
    lastName: string;
    relationshipType: RelationshipType;
    primaryPhoneNumber: string;
    ghanaCardNumber?: string;
  };
  location: {
    districtId: string;
    streetAddress: string;
    landmarkAndDirections: string;
    latitude: number;
    longitude: number;
    accuracyMetres: number;
  };
}

export interface UpdateCustomerPayload {
  businessName?: string;
  tradingName?: string;
  customerType?: CustomerType;
  regionId?: string;
  primaryPhoneNumber?: string;
  whatsAppNumber?: string;
  representative?: {
    firstName: string;
    middleName?: string | null;
    lastName: string;
    relationshipType: RelationshipType;
    primaryPhoneNumber: string;
    ghanaCardNumber?: string;
  };
  location?: {
    districtId: string;
    streetAddress?: string;
    landmarkAndDirections?: string;
    latitude?: number;
    longitude?: number;
    accuracyMetres?: number;
  };
}

export interface AddLocationPayload {
  locationType?: LocationType;
  regionId: string;
  districtId: string;
  landmarkAndDirections: string;
  streetAddress?: string;
  latitude?: number;
  longitude?: number;
  accuracyMetres?: number;
  isPrimary?: boolean;
}

// ── API ────────────────────────────────────────────────────────────────
export const customersApi = {
  getCustomers: async (params?: {
    search?: string;
    sort?: string;
    pageNumber?: number;
    pageSize?: number;
    regionId?: string;
    branchId?: string;
    customerType?: string;
    status?: string;
  }) => {
    const res = await apiClient.get<any>('/customers', { params });
    return res.data;
  },

  getCustomer: async (id: string): Promise<Customer> => {
    const res = await apiClient.get<Customer>(`/customers/${id}`);
    return res.data;
  },

  createCustomer: async (payload: CreateCustomerPayload): Promise<Customer> => {
    const res = await apiClient.post<Customer>('/customers', payload);
    return res.data;
  },

  updateCustomer: async (id: string, payload: UpdateCustomerPayload): Promise<Customer> => {
    const res = await apiClient.patch<Customer>(`/customers/${id}`, payload);
    return res.data;
  },

  addLocation: async (customerId: string, payload: AddLocationPayload) => {
    const res = await apiClient.post(`/customers/${customerId}/locations`, payload);
    return res.data;
  },

  uploadPortrait: async (customerId: string, personId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post(
      `/customers/${customerId}/people/${personId}/portrait`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return res.data;
  },
};

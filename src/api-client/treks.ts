import apiClient, { publicApi } from './api';

export type TrekStatus = 'Draft' | 'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled';
export type PaymentMethod = 'Cash' | 'MobileMoney' | 'Credit' | 'Cheque' | 'BankTransfer';

export interface TrekStopProduct {
  stopProductId: string;
  productId: string;
  productName: string;
  basicUnitName?: string | null;
  packagingUnitName: string | null;
  basicUnitPrice: number;
  packagingUnitPrice: number | null;
  amountDue?: number | null;
  plannedBasicQuantity: number;
  plannedPackagingQuantity: number | null;
  basicQtyDelivered?: number | null;
  packagingQtyDelivered?: number | null;
  paymentMethod?: PaymentMethod | null;
  amtPaid?: number | null;
  balance?: number | null;
  notes?: string | null;
  deliveredAt?: string | null;
}

export interface TrekStop {
  stopId: string;
  sequence: number;
  customerAccountId: string;
  customerName: string;
  customerCode: string;
  customerPhone?: string | null;
  customerType?: string | null;
  regionName?: string | null;
  districtName?: string | null;
  primaryLocationLandmark?: string | null;
  primaryLocationStreet?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracyMetres?: number | null;
  primaryContactName?: string | null;
  primaryContactPhone?: string | null;
  notes?: string | null;
  returns?: DriverReturn[];
  products: TrekStopProduct[];
}

export interface Trek {
  id: string;
  trekNumber: string;
  regionId: string;
  regionName: string;
  branchId: string | null;
  branchName: string | null;
  driverStaffId: string;
  driverName: string;
  salesStaffId: string | null;
  salesStaffName: string | null;
  vehicleId: string;
  vehicleDisplayName: string;
  scheduledDate: string;
  status: TrekStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  syncRequired?: boolean;
  stops: TrekStop[];
}

export interface CreateTrekPayload {
  regionId: string;
  branchId?: string | null;
  scheduledDate: string;
  vehicleId: string;
  salesStaffId?: string | null;
  notes?: string;
}

export interface UpdateTrekPayload {
  regionId: string;
  branchId?: string | null;
  scheduledDate: string;
  vehicleId: string;
  salesStaffId?: string | null;
  notes?: string | null;
}

export interface AddStopPayload {
  customerAccountId: string;
  sequence: number;
  notes?: string;
  products: { productId: string; plannedBasicQuantity?: number; plannedPackagingQuantity?: number }[];
}

export interface UpdateStopPayload {
  customerAccountId?: string;
  sequence?: number;
  notes?: string;
  products?: AddStopPayload['products'];
}

export interface RecordDeliveryPayload {
  products: {
    stopProductId: string;
    basicQtyDelivered?: number;
    packagingQtyDelivered?: number;
    paymentMethod?: PaymentMethod;
    amtPaid?: number;
    balance?: number;
    notes?: string;
  }[];
}

export interface RecordReturnPayload {
  productId: string;
  basicQtyReturned: number;
  packagingQtyReturned?: number;
  refundMethod?: PaymentMethod;
  refundAmount?: number;
  reason?: string;
  clientGeneratedId?: string;
  gps?: { latitude: number; longitude: number; accuracyMetres?: number };
}

export interface StopProductPricePayload {
  basicUnitPrice: number;
  packagingUnitPrice?: number | null;
}

export interface SyncTrekPricesResponse {
  trekId: string;
  trekNumber: string;
  productsUpdated: number;
  packagingAdded: number;
  packagingRemoved: number;
  changes: string[];
}

export interface TrekPriceDifference {
  stopId: string;
  stopSequence: number;
  customerName: string;
  stopProductId: string;
  productName: string;
  snapshotBasicUnitPrice: number;
  catalogBasicUnitPrice: number;
  basicPriceChanged: boolean;
  snapshotPackagingUnitPrice: number | null;
  catalogPackagingUnitPrice: number | null;
  packagingPriceChanged: boolean;
  packagingAdded: boolean;
  packagingRemoved: boolean;
}

export interface TrekPriceDiffResponse {
  trekId: string;
  trekNumber: string;
  syncRequired: boolean;
  differences: TrekPriceDifference[];
}

export interface DriverStopProduct {
  stopProductId: string;
  productName: string;
  basicUnitName?: string | null;
  packagingUnitName: string | null;
  basicUnitPrice: number;
  packagingUnitPrice: number | null;
  amountDue?: number | null;
  plannedBasicQuantity: number;
  plannedPackagingQuantity: number | null;
  basicQtyDelivered?: number | null;
  packagingQtyDelivered?: number | null;
  paymentMethod?: PaymentMethod | null;
  amtPaid?: number | null;
  balance?: number | null;
  notes?: string | null;
  deliveredAt?: string | null;
  isUnplanned?: boolean;
}

export interface DriverReturn {
  returnId: string;
  productId: string;
  productName: string;
  basicUnitName: string | null;
  packagingUnitName: string | null;
  basicQtyReturned: number;
  packagingQtyReturned: number | null;
  basicUnitPrice: number;
  packagingUnitPrice: number | null;
  refundAmount: number | null;
  refundMethod: PaymentMethod | null;
  reason: string | null;
  recordedAt: string;
}

export interface DriverStop {
  stopId: string;
  sequence: number;
  customerName: string;
  customerCode: string;
  customerType?: string | null;
  primaryPhoneNumber?: string | null;
  regionName?: string | null;
  districtName?: string | null;
  primaryLocationLandmark?: string | null;
  primaryLocationStreet?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracyMetres?: number | null;
  primaryContactName?: string | null;
  primaryContactPhone?: string | null;
  notes?: string | null;
  location?: string | null;
  products: DriverStopProduct[];
  isWalkIn?: boolean;
  returns?: DriverReturn[];
}

export interface DriverTrek {
  trekId: string;
  trekNumber: string;
  scheduledDate: string;
  driverName: string;
  vehicleDisplayName: string;
  regionName: string;
  salesStaffId: string | null;
  salesStaffName: string | null;
  status: TrekStatus;
  isLocked: boolean;
  stops: DriverStop[];
}

const normalizeStopProduct = <T extends { basicUnitName?: string | null; unit?: string | null }>(product: T): T => ({
  ...product,
  basicUnitName: product.basicUnitName ?? product.unit ?? null,
});

const normalizeTrekProducts = <T extends { stops: { products: { basicUnitName?: string | null; unit?: string | null }[] }[] }>(trek: T): T => ({
  ...trek,
  stops: trek.stops.map((stop) => ({
    ...stop,
    products: stop.products.map(normalizeStopProduct),
  })),
});

export const treksApi = {
  getTreks: async (params?: {
    search?: string;
    sort?: string;
    pageNumber?: number;
    pageSize?: number;
    regionId?: string;
    branchId?: string;
    status?: string;
    scheduledDate?: string;
  }) => {
    const res = await apiClient.get<any>('/treks', { params });
    return res.data;
  },

  getTrek: async (id: string): Promise<Trek> => {
    const res = await apiClient.get<Trek>(`/treks/${id}`);
    return normalizeTrekProducts(res.data);
  },

  createTrek: async (payload: CreateTrekPayload): Promise<Trek> => {
    const res = await apiClient.post<Trek>('/treks', payload);
    return normalizeTrekProducts(res.data);
  },

  updateTrek: async (id: string, payload: UpdateTrekPayload): Promise<Trek> => {
    const res = await apiClient.patch<Trek>(`/treks/${id}`, payload);
    return normalizeTrekProducts(res.data);
  },

  deleteTrek: async (id: string): Promise<void> => {
    await apiClient.delete(`/treks/${id}`);
  },

  changeStatus: async (id: string, status: TrekStatus): Promise<Trek> => {
    const res = await apiClient.patch<Trek>(`/treks/${id}/status`, { status });
    return normalizeTrekProducts(res.data);
  },

  addStop: async (trekId: string, payload: AddStopPayload): Promise<TrekStop> => {
    const res = await apiClient.post<TrekStop>(`/treks/${trekId}/stops`, payload);
    return { ...res.data, products: res.data.products.map(normalizeStopProduct) };
  },

  updateStop: async (trekId: string, stopId: string, payload: UpdateStopPayload): Promise<TrekStop> => {
    const res = await apiClient.patch<TrekStop>(`/treks/${trekId}/stops/${stopId}`, payload);
    return { ...res.data, products: res.data.products.map(normalizeStopProduct) };
  },

  updateStopProductPrice: async (trekId: string, stopId: string, stopProductId: string, payload: StopProductPricePayload): Promise<TrekStopProduct> => {
    const res = await apiClient.patch<TrekStopProduct>(`/treks/${trekId}/stops/${stopId}/products/${stopProductId}/price`, payload);
    return normalizeStopProduct(res.data);
  },

  syncPrices: async (trekId: string): Promise<SyncTrekPricesResponse> => {
    const res = await apiClient.post<SyncTrekPricesResponse>(`/treks/${trekId}/sync-prices`);
    return res.data;
  },

  getPriceDiff: async (trekId: string): Promise<TrekPriceDiffResponse> => {
    const res = await apiClient.get<TrekPriceDiffResponse>(`/treks/${trekId}/price-diff`);
    return res.data;
  },

  removeStop: async (trekId: string, stopId: string): Promise<void> => {
    await apiClient.delete(`/treks/${trekId}/stops/${stopId}`);
  },

  recordDelivery: async (id: string, payload: RecordDeliveryPayload) => {
    const res = await apiClient.post(`/treks/${id}/record`, payload);
    return res.data;
  },

  recordReturn: async (trekId: string, stopId: string, payload: RecordReturnPayload): Promise<DriverReturn> => {
    const res = await apiClient.post<DriverReturn>(`/treks/${trekId}/stops/${stopId}/returns`, payload);
    return res.data;
  },

  voidReturn: async (trekId: string, stopId: string, returnId: string): Promise<void> => {
    await apiClient.delete(`/treks/${trekId}/stops/${stopId}/returns/${returnId}`);
  },

  generateLink: async (id: string): Promise<{ token: string; url: string }> => {
    const res = await apiClient.post<{ token: string; url: string }>(`/treks/${id}/generate-link`);
    return res.data;
  },

  sendEmail: async (id: string, staffIds: string[]) => {
    const res = await apiClient.post(`/treks/${id}/send-email`, { staffIds });
    return res.data;
  },

  downloadPdf: async (id: string): Promise<Blob> => {
    const res = await apiClient.get(`/treks/${id}/sheet/pdf`, { responseType: 'blob' });
    return res.data as Blob;
  },

  getByDriverToken: async (token: string): Promise<DriverTrek> => {
    const res = await publicApi.get<DriverTrek>(`/treks/driver/${token}`);
    return normalizeTrekProducts(res.data);
  },

  recordByDriverToken: async (
    token: string,
    payload: RecordDeliveryPayload
  ): Promise<{ trekId: string; trekNumber: string; status: TrekStatus; recorded: number }> => {
    const res = await publicApi.post(`/treks/driver/${token}/record`, payload);
    return res.data;
  },
};

import apiClient, { publicApi } from './api';

export type TrekStatus = 'Draft' | 'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled';
export type PaymentMethod = 'Cash' | 'MobileMoney' | 'Credit' | 'Cheque' | 'BankTransfer';

export interface TrekStopProduct {
  stopProductId: string;
  productId: string;
  productName: string;
  unit?: string;
  plannedQuantity: number;
  qtyDelivered?: number | null;
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
  primaryContactName?: string | null;
  primaryContactPhone?: string | null;
  notes?: string | null;
  products: TrekStopProduct[];
}

export interface Trek {
  id: string;
  trekNumber: string;
  branchId: string;
  branchName: string;
  driverStaffId: string;
  driverName: string;
  vehicleId: string;
  vehicleDisplayName: string;
  scheduledDate: string;
  status: TrekStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  stops: TrekStop[];
}

export interface CreateTrekPayload {
  branchId: string;
  scheduledDate: string;
  vehicleId: string;
  notes?: string;
}

export interface UpdateTrekPayload {
  branchId: string;
  scheduledDate: string;
  vehicleId: string;
  notes?: string | null;
}

export interface AddStopPayload {
  customerAccountId: string;
  sequence: number;
  notes?: string;
  products: { productId: string; plannedQuantity: number }[];
}

export interface RecordDeliveryPayload {
  products: {
    stopProductId: string;
    qtyDelivered?: number;
    paymentMethod?: PaymentMethod;
    amtPaid?: number;
    balance?: number;
    notes?: string;
  }[];
}

export interface DriverStopProduct {
  stopProductId: string;
  productName: string;
  unit?: string | null;
  plannedQuantity: number;
  qtyDelivered?: number | null;
  paymentMethod?: PaymentMethod | null;
  amtPaid?: number | null;
  balance?: number | null;
  notes?: string | null;
  deliveredAt?: string | null;
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
  primaryContactName?: string | null;
  primaryContactPhone?: string | null;
  notes?: string | null;
  location?: string | null;
  products: DriverStopProduct[];
}

export interface DriverTrek {
  trekId: string;
  trekNumber: string;
  scheduledDate: string;
  driverName: string;
  vehicleDisplayName: string;
  branchName: string;
  status: TrekStatus;
  isLocked: boolean;
  stops: DriverStop[];
}

export const treksApi = {
  getTreks: async (params?: {
    search?: string;
    sort?: string;
    pageNumber?: number;
    pageSize?: number;
    branchId?: string;
    status?: string;
    scheduledDate?: string;
  }) => {
    const res = await apiClient.get<any>('/treks', { params });
    return res.data;
  },

  getTrek: async (id: string): Promise<Trek> => {
    const res = await apiClient.get<Trek>(`/treks/${id}`);
    return res.data;
  },

  createTrek: async (payload: CreateTrekPayload): Promise<Trek> => {
    const res = await apiClient.post<Trek>('/treks', payload);
    return res.data;
  },

  updateTrek: async (id: string, payload: UpdateTrekPayload): Promise<Trek> => {
    const res = await apiClient.patch<Trek>(`/treks/${id}`, payload);
    return res.data;
  },

  changeStatus: async (id: string, status: TrekStatus): Promise<Trek> => {
    const res = await apiClient.patch<Trek>(`/treks/${id}/status`, { status });
    return res.data;
  },

  addStop: async (trekId: string, payload: AddStopPayload): Promise<TrekStop> => {
    const res = await apiClient.post<TrekStop>(`/treks/${trekId}/stops`, payload);
    return res.data;
  },

  removeStop: async (trekId: string, stopId: string): Promise<void> => {
    await apiClient.delete(`/treks/${trekId}/stops/${stopId}`);
  },

  recordDelivery: async (id: string, payload: RecordDeliveryPayload) => {
    const res = await apiClient.post(`/treks/${id}/record`, payload);
    return res.data;
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
    return res.data;
  },

  recordByDriverToken: async (
    token: string,
    payload: RecordDeliveryPayload
  ): Promise<{ trekId: string; trekNumber: string; status: TrekStatus; recorded: number }> => {
    const res = await publicApi.post(`/treks/driver/${token}/record`, payload);
    return res.data;
  },
};

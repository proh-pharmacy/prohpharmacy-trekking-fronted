import apiClient, { baseURL } from './api';
import { getAccessToken } from './tokenStorage';

// ── Trek Report ────────────────────────────────────────────────────────
export interface TrekReportItem {
  id: string;
  trekNumber: string;
  scheduledDate: string;
  driverName: string;
  branchName: string;
  status: string;
  stopsCount: number;
  totalCollected: number;
  totalOutstanding: number;
}

export interface TrekReportResponse {
  totalTreks: number;
  completed: number;
  cancelled: number;
  inProgress: number;
  totalCollected: number;
  totalOutstanding: number;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  treks: TrekReportItem[];
}

// ── Collections Report ─────────────────────────────────────────────────
export interface CollectionByMethod {
  paymentMethod: string;
  total: number;
  transactions: number;
}

export interface CollectionByBranch {
  branchName: string;
  total: number;
  transactions: number;
}

export interface CollectionsReportResponse {
  from: string | null;
  to: string | null;
  totalCollected: number;
  totalTransactions: number;
  byPaymentMethod: CollectionByMethod[];
  byBranch: CollectionByBranch[];
}

// ── Products Report ────────────────────────────────────────────────────
export interface ProductReportItem {
  productId: string;
  productName: string;
  unit: string;
  totalQtyDelivered: number;
  totalCollected: number;
  totalOutstanding: number;
  treksCount: number;
}

export interface ProductsReportResponse {
  totalProductLines: number;
  totalAmountCollected: number;
  totalOutstanding: number;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  products: ProductReportItem[];
}

// ── Helpers ────────────────────────────────────────────────────────────
async function exportFile(url: string, fallback: string): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  });
  if (!response.ok) throw new Error(`Export failed: ${response.status}`);
  const disposition = response.headers.get('Content-Disposition');
  const filename = disposition?.match(/filename="?([^";]+)"?/)?.[1] ?? fallback;
  const blob = await response.blob();
  return { blob, filename };
}

// ── API ────────────────────────────────────────────────────────────────
export const reportsApi = {
  getTrekReport: async (params?: {
    from?: string;
    to?: string;
    branchId?: string;
    driverId?: string;
    status?: string;
    search?: string;
    sort?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Promise<TrekReportResponse> => {
    const res = await apiClient.get<TrekReportResponse>('/reports/treks', { params });
    return res.data;
  },

  exportTrekReport: async (params?: {
    from?: string;
    to?: string;
    branchId?: string;
    driverId?: string;
    status?: string;
  }): Promise<{ blob: Blob; filename: string }> => {
    const q = new URLSearchParams();
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    if (params?.branchId) q.set('branchId', params.branchId);
    if (params?.driverId) q.set('driverId', params.driverId);
    if (params?.status) q.set('status', params.status);
    const qs = q.toString();
    return exportFile(`${baseURL}/reports/treks/export${qs ? `?${qs}` : ''}`, 'TrekReport.xlsx');
  },

  getCollectionsReport: async (params?: {
    from?: string;
    to?: string;
    branchId?: string;
    regionId?: string;
  }): Promise<CollectionsReportResponse> => {
    const res = await apiClient.get<CollectionsReportResponse>('/reports/collections', { params });
    return res.data;
  },

  exportCollectionsReport: async (params?: {
    from?: string;
    to?: string;
    branchId?: string;
    regionId?: string;
  }): Promise<{ blob: Blob; filename: string }> => {
    const q = new URLSearchParams();
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    if (params?.branchId) q.set('branchId', params.branchId);
    if (params?.regionId) q.set('regionId', params.regionId);
    const qs = q.toString();
    return exportFile(`${baseURL}/reports/collections/export${qs ? `?${qs}` : ''}`, 'CollectionsReport.xlsx');
  },

  getProductsReport: async (params?: {
    from?: string;
    to?: string;
    branchId?: string;
    search?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Promise<ProductsReportResponse> => {
    const res = await apiClient.get<ProductsReportResponse>('/reports/products', { params });
    return res.data;
  },

  exportProductsReport: async (params?: {
    from?: string;
    to?: string;
    branchId?: string;
    productId?: string;
  }): Promise<{ blob: Blob; filename: string }> => {
    const q = new URLSearchParams();
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    if (params?.branchId) q.set('branchId', params.branchId);
    if (params?.productId) q.set('productId', params.productId);
    const qs = q.toString();
    return exportFile(`${baseURL}/reports/products/export${qs ? `?${qs}` : ''}`, 'ProductDeliveryReport.xlsx');
  },
};

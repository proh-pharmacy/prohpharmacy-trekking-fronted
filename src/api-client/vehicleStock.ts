import apiClient from './api';
import type { PaginatedDataResponse } from '../components/data-table';

export interface StockItem {
  stockId: string;
  productId: string;
  productName: string;
  description: string | null;
  basicUnitId: string;
  basicUnitName: string;
  basicUnitPrice: number;
  packagingUnitId: string | null;
  packagingUnitName: string | null;
  packagingUnitPrice: number | null;
  isActive: boolean;
  basicQuantityOnHand: number;
  packagingQuantityOnHand: number;
  lowStockThreshold: number | null;
  isLowStock: boolean;
  updatedAt: string | null;
}

export interface StockLineItem {
  productId: string;
  basicQty: number;
  packagingQty: number;
}

export interface LoadStockPayload {
  items: StockLineItem[];
}

export interface RemoveStockPayload {
  reason: string;
  items: StockLineItem[];
}

export interface StockMutationResponse {
  productsUpdated: number;
  updatedStock: StockItem[];
}

export interface ResetVehicleStockResponse {
  productsRemoved: number;
  ledgerEntriesCreated: number;
  resetAt: string;
}

export interface StockSummary {
  vehicleId: string;
  vehicleInfo: string;
  trackedProductCount: number;
  inStockProductCount: number;
  outOfStockProductCount: number;
}

export type StockLedgerSource = 'ManualLoad' | 'TrekCompletion' | 'ReturnApproval' | 'StockReset';
export type StockLedgerChangeType = 'Addition' | 'Reduction';

export interface StockLedgerEntry {
  id: string;
  productId: string;
  productName: string;
  basicUnitName: string;
  packagingUnitName: string | null;
  changeType: StockLedgerChangeType;
  source: StockLedgerSource;
  basicQtyChange: number;
  packagingQtyChange: number;
  basicBalanceAfter: number;
  packagingBalanceAfter: number;
  reason: string | null;
  authorName: string | null;
  recordedAt: string;
}

export const vehicleStockApi = {
  getStock: async (vehicleId: string): Promise<StockItem[]> => {
    const res = await apiClient.get<StockItem[]>(`/vehicles/${vehicleId}/stock`);
    return Array.isArray(res.data) ? res.data : [];
  },

  getStockSummary: async (vehicleId: string): Promise<StockSummary> => {
    const res = await apiClient.get<StockSummary>(`/vehicles/${vehicleId}/stock/summary`);
    return res.data;
  },

  getProductStock: async (vehicleId: string, productId: string): Promise<StockItem> => {
    const res = await apiClient.get<StockItem>(`/vehicles/${vehicleId}/stock/${productId}`);
    return res.data;
  },

  loadStock: async (
    vehicleId: string,
    payload: LoadStockPayload,
  ): Promise<StockMutationResponse> => {
    const res = await apiClient.post<StockMutationResponse>(
      `/vehicles/${vehicleId}/stock/load`,
      payload,
    );
    return res.data;
  },

  removeStock: async (
    vehicleId: string,
    payload: RemoveStockPayload,
  ): Promise<StockMutationResponse> => {
    const res = await apiClient.post<StockMutationResponse>(
      `/vehicles/${vehicleId}/stock/remove`,
      payload,
    );
    return res.data;
  },

  resetStock: async (vehicleId: string, reason: string): Promise<ResetVehicleStockResponse> => {
    const res = await apiClient.post<ResetVehicleStockResponse>(
      `/vehicles/${vehicleId}/stock/reset`,
      { reason },
    );
    return res.data;
  },

  getStockLedger: async (
    vehicleId: string,
    params?: {
      productId?: string;
      source?: StockLedgerSource;
      from?: string;
      to?: string;
      pageNumber?: number;
      pageSize?: number;
    },
  ): Promise<PaginatedDataResponse<StockLedgerEntry>> => {
    const res = await apiClient.get<PaginatedDataResponse<StockLedgerEntry>>(
      `/vehicles/${vehicleId}/stock/ledger`,
      { params },
    );
    return res.data;
  },

  getStockTrend: async (
    vehicleId: string,
    params: { productId: string; from?: string; to?: string },
  ): Promise<StockLedgerEntry[]> => {
    const res = await apiClient.get<StockLedgerEntry[] | PaginatedDataResponse<StockLedgerEntry>>(
      `/vehicles/${vehicleId}/stock/ledger`,
      { params },
    );
    return Array.isArray(res.data) ? res.data : (res.data.data ?? []);
  },
};

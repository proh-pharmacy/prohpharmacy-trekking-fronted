import apiClient from './api';

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

export interface StockSummary {
  vehicleId: string;
  vehicleInfo: string;
  trackedProductCount: number;
  inStockProductCount: number;
  outOfStockProductCount: number;
}

export type StockLedgerSource = 'ManualLoad' | 'TrekCompletion' | 'ReturnApproval';
export type StockLedgerChangeType = 'Addition' | 'Reduction';

export interface StockLedgerEntry {
  id: string;
  productId: string;
  productName: string;
  changeType: StockLedgerChangeType;
  source: StockLedgerSource;
  basicQtyChange: number;
  packagingQtyChange: number;
  balanceAfter: number;
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
};

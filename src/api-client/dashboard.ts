import apiClient from './api';

export interface CollectionDataPoint {
  label: string;
  date: string;
  total: number;
}

export interface PaymentMethodDataPoint {
  paymentMethod: string;
  total: number;
  transactions: number;
}

export interface DashboardResponse {
  period: 'week' | 'month';
  totalCollected: number;
  totalOutstanding: number;
  activeTreks: number;
  customersWithDebt: number;
  collectionsOverTime: CollectionDataPoint[];
  byPaymentMethod: PaymentMethodDataPoint[];
}

export const dashboardApi = {
  get: async (params?: { period?: 'week' | 'month'; branchId?: string }): Promise<DashboardResponse> => {
    const res = await apiClient.get<DashboardResponse>('/dashboard', { params });
    return res.data;
  },
};

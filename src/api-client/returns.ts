import apiClient from './api';

export type ReturnApprovalStatus = 'Pending' | 'Approved' | 'Rejected';
export const PENDING_RETURNS_COUNT_QUERY_KEY = ['returns', 'pending-count'] as const;

export interface InvoiceReturnReview {
  returnId: string;
  stopId: string;
  customerName: string;
  invoiceNumber: string;
  productId: string;
  productName: string;
  basicQtyReturned: number;
  packagingQtyReturned: number | null;
  refundAmount: number;
  refundMethod: string | null;
  reason: string | null;
  approvalStatus: ReturnApprovalStatus;
  rejectionReason: string | null;
  recordedAt: string;
  approvedAt: string | null;
}

export interface GlobalInvoiceReturnReview extends InvoiceReturnReview {
  trekId: string;
  trekNumber: string;
  trekDate: string;
  trekStatus: string;
  regionName: string;
  driverName: string;
  customerId: string;
  customerCode: string;
  invoiceId: string;
  basicUnitName: string;
  packagingUnitName: string | null;
  basicUnitPrice: number;
  packagingUnitPrice: number | null;
  recordedByName: string | null;
  approvedByName: string | null;
}

export interface ReturnDecisionResponse {
  returnId: string;
  invoiceNumber: string;
  productName: string;
  refundAmount?: number;
  approvalStatus: ReturnApprovalStatus;
  rejectionReason?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
}

export const returnsApi = {
  getPendingCount: async (): Promise<number> => {
    const response = await apiClient.get<{ count: number }>('/returns/pending-count');
    return Number(response.data?.count ?? 0);
  },

  getForTrek: async (
    trekId: string,
    approvalStatus?: ReturnApprovalStatus,
  ): Promise<InvoiceReturnReview[]> => {
    const response = await apiClient.get<InvoiceReturnReview[]>(`/treks/${trekId}/returns`, {
      params: approvalStatus ? { approvalStatus } : undefined,
    });
    return Array.isArray(response.data) ? response.data : [];
  },

  approve: async (returnId: string): Promise<ReturnDecisionResponse> => {
    const response = await apiClient.post<ReturnDecisionResponse>(`/returns/${returnId}/approve`);
    return response.data;
  },

  reject: async (returnId: string, reason: string): Promise<ReturnDecisionResponse> => {
    const response = await apiClient.post<ReturnDecisionResponse>(`/returns/${returnId}/reject`, { reason });
    return response.data;
  },
};

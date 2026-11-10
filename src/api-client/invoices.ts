import apiClient, { publicApi } from './api';

export type CollectionMethod = 'Cash' | 'MobileMoney' | 'Cheque' | 'BankTransfer';
export interface InvoicePaymentRequest {
  clientGeneratedId: string;
  amount: number;
  paymentMethod: CollectionMethod;
  reference: string | null;
  recordedAt: string;
}
export interface PaymentReceipt extends InvoicePaymentRequest {
  paymentId: string;
  receiptNumber: string | null;
  invoiceId: string;
  invoiceNumber: string;
  customerAccountId: string;
  recordedByStaffId: string | null;
  invoiceTotalAtPayment: number;
  balanceAfterPayment: number;
  isLegacy: boolean;
}
export interface StopInvoiceSummary {
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  invoiceStatus?: SaleInvoiceStatus | null;
  invoiceTotal?: number | null;
  invoicePaid?: number | null;
  invoiceBalance?: number | null;
}

export type SaleInvoiceStatus = 'Issued' | 'PartiallyPaid' | 'Paid' | 'Voided';

export interface SaleInvoiceLineItem {
  stopProductId: string;
  basicQuantity: number;
  packagingQuantity: number | null;
  plannedBasicQuantity: number | null;
  plannedPackagingQuantity: number | null;
  productId: string;
  productName: string;
  basicUnitName: string;
  packagingUnitName: string | null;
  basicQtyDelivered: number | null;
  packagingQtyDelivered: number | null;
  basicUnitPrice: number;
  packagingUnitPrice: number | null;
  lineTotal: number;
  amtPaid: number | null;
  balance: number | null;
  paymentMethod: string | null;
  isUnplanned: boolean;
  deliveredAt: string | null;
}

export interface SaleInvoice {
  id: string;
  invoiceNumber: string | null;
  status: SaleInvoiceStatus;
  issuedAt: string;
  createdOffline: boolean;
  trekkingTripId: string;
  trekNumber: string;
  trekDate: string;
  driverName: string;
  salesStaffName: string | null;
  vehicleDisplayName: string;
  regionName: string;
  customerAccountId: string;
  customerName: string;
  customerCode: string;
  customerTradingName: string | null;
  customerPhone: string;
  customerWhatsAppNumber: string | null;
  customerRegionName: string;
  totalAmount: number;
  totalPaid: number;
  balance: number;
  lineItems: SaleInvoiceLineItem[];
  payments: PaymentReceipt[];
}

export interface InvoiceListFilters {
  customerId?: string;
  trekId?: string;
  regionId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sort?: string;
}

export const invoicesApi = {
  getDriverInvoice: async (token: string, invoiceId: string): Promise<SaleInvoice> =>
    (await publicApi.get(`/treks/driver/${encodeURIComponent(token)}/invoices/${encodeURIComponent(invoiceId)}`)).data,
  recordPayment: async (invoiceId: string, payment: InvoicePaymentRequest, token?: string): Promise<PaymentReceipt> => {
    const prefix = token ? `/treks/driver/${encodeURIComponent(token)}` : '';
    return (await (token ? publicApi : apiClient).post(`${prefix}/invoices/${encodeURIComponent(invoiceId)}/payments`, payment)).data;
  },
  getReceipt: async (paymentId: string, token?: string): Promise<PaymentReceipt> => {
    const prefix = token ? `/treks/driver/${encodeURIComponent(token)}` : '';
    return (await (token ? publicApi : apiClient).get(`${prefix}/payments/${encodeURIComponent(paymentId)}/receipt`)).data;
  },
  getInvoice: async (invoiceNumber: string): Promise<SaleInvoice> => {
    const response = await apiClient.get<SaleInvoice>(`/invoices/${encodeURIComponent(invoiceNumber)}`);
    return response.data;
  },
  exportInvoices: async (
    format: 'excel' | 'pdf',
    filters: InvoiceListFilters = {},
  ): Promise<{ blob: Blob; filename: string }> => {
    const response = await apiClient.get<Blob>('/invoices/export', {
      params: { format, ...filters },
      responseType: 'blob',
    });
    const disposition = String(response.headers['content-disposition'] ?? '');
    const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1]
      ?? `Invoices.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
    return { blob: response.data, filename };
  },
};

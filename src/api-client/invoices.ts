import apiClient from './api';

export type SaleInvoiceStatus = 'Issued' | 'PartiallyPaid' | 'Paid' | 'Voided';

export interface SaleInvoiceLineItem {
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

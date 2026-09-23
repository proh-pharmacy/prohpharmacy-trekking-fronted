import apiClient from './api';

export interface ExportDownload {
  blob: Blob;
  filename: string;
}

export interface CustomerExportParams {
  search?: string;
  regionId?: string;
  branchId?: string;
  customerType?: string;
  status?: string;
}

export interface StaffExportParams {
  search?: string;
  branchId?: string;
  status?: string;
}

const filenameFromDisposition = (disposition: string | undefined, fallback: string): string => {
  if (!disposition) return fallback;
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try { return decodeURIComponent(encoded.replace(/^"|"$/g, '')); }
    catch { return encoded.replace(/^"|"$/g, ''); }
  }
  return disposition.match(/filename="?([^";]+)"?/i)?.[1]?.trim() || fallback;
};

async function downloadExport(
  url: string,
  fallbackName: string,
  params?: object,
): Promise<ExportDownload> {
  const response = await apiClient.get<Blob>(url, {
    params,
    responseType: 'blob',
    headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  });
  return {
    blob: response.data,
    filename: filenameFromDisposition(response.headers['content-disposition'], fallbackName),
  };
}

export const dataExportsApi = {
  exportCustomers: (params?: CustomerExportParams) =>
    downloadExport('/customers/export', 'customers.xlsx', params),

  exportProducts: (mode: 'catalog' | 'pricing' = 'catalog') =>
    downloadExport('/products/export', mode === 'pricing' ? 'products_pricing.xlsx' : 'products_catalog.xlsx', { mode }),

  exportStaff: (params?: StaffExportParams) =>
    downloadExport('/staff/export', 'staff.xlsx', params),

  exportRegionalMarkups: () =>
    downloadExport('/organisation/markups/export', 'regional_markup_rules.xlsx'),

  exportCustomerMarkups: (regionId?: string) =>
    downloadExport('/customers/markups/export', 'customer_markup_rules.xlsx', { regionId }),
};

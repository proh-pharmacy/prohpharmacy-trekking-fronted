import apiClient from './api';

export interface Unit {
  id: string;
  name: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface CreateUnitPayload {
  name: string;
}

export interface UpdateUnitPayload {
  name: string;
}

export interface Product {
  id: string;
  name: string;
  unit?: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface CreateProductPayload {
  name: string;
  unit?: string;
  description?: string;
}

export interface UpdateProductPayload {
  name: string;
  unit?: string;
  description?: string;
}

export interface ImportProductsPayload {
  file: File;
  productNameColumn: string;
  unitColumn: string;
}

export interface ImportProductsResult {
  imported: number;
  skipped: number;
  unitsCreated: number;
  skippedNames: string[];
}

export const productsApi = {
  // Units endpoints
  getUnits: async (params?: {
    search?: string;
    sort?: string;
    pageNumber?: number;
    pageSize?: number;
    isActive?: boolean;
  }): Promise<Unit[]> => {
    const res = await apiClient.get<any>('/units', { params });
    const payload = res.data?.data || res.data;
    return Array.isArray(payload) ? payload : [];
  },

  createUnit: async (payload: CreateUnitPayload): Promise<Unit> => {
    const res = await apiClient.post<Unit>('/units', payload);
    return res.data;
  },

  updateUnit: async (id: string, payload: UpdateUnitPayload): Promise<Unit> => {
    const res = await apiClient.put<Unit>(`/units/${id}`, payload);
    return res.data;
  },

  toggleUnitStatus: async (id: string): Promise<Unit> => {
    const res = await apiClient.patch<Unit>(`/units/${id}/status`);
    return res.data;
  },

  // Products endpoints
  getProducts: async (params?: {
    search?: string;
    sort?: string;
    pageNumber?: number;
    pageSize?: number;
    isActive?: boolean;
  }): Promise<Product[]> => {
    const res = await apiClient.get<any>('/products', { params });
    const payload = res.data?.data || res.data;
    return Array.isArray(payload) ? payload : [];
  },

  getProduct: async (id: string): Promise<Product> => {
    const res = await apiClient.get<Product>(`/products/${id}`);
    return res.data;
  },

  createProduct: async (payload: CreateProductPayload): Promise<Product> => {
    const res = await apiClient.post<Product>('/products', payload);
    return res.data;
  },

  updateProduct: async (id: string, payload: UpdateProductPayload): Promise<Product> => {
    const res = await apiClient.put<Product>(`/products/${id}`, payload);
    return res.data;
  },

  toggleProductStatus: async (id: string): Promise<Product> => {
    const res = await apiClient.patch<Product>(`/products/${id}/status`);
    return res.data;
  },

  importProducts: async (payload: ImportProductsPayload): Promise<ImportProductsResult> => {
    const formData = new FormData();
    formData.append('file', payload.file);
    formData.append('productNameColumn', payload.productNameColumn);
    formData.append('unitColumn', payload.unitColumn);
    const res = await apiClient.post<ImportProductsResult>('/products/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};

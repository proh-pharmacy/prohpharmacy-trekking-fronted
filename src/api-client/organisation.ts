import apiClient from './api';

export interface Region {
  id: string;
  name: string;
  code?: string;
  districtCount?: number;
}

export interface District {
  id: string;
  name: string;
  regionId: string;
  regionName?: string;
  branchCount?: number;
}

export type BranchType = 'Retail' | 'Wholesale' | 'Laboratory';

export interface Branch {
  id: string;
  code?: string;
  name: string;
  branchType?: BranchType;
  regionId: string;
  regionName?: string;
  districtId: string;
  districtName?: string;
  address: string;
  contactNumber: string;
  phoneNumber?: string;
  latitude?: number | null;
  longitude?: number | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface CreateDistrictPayload {
  name: string;
  regionId: string;
}

export interface CreateBranchPayload {
  name: string;
  branchType: BranchType;
  regionId: string;
  districtId: string;
  address: string;
  contactNumber: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface UpdateBranchPayload {
  name: string;
  branchType: BranchType;
  regionId: string;
  districtId: string;
  address: string;
  contactNumber: string;
  latitude?: number | null;
  longitude?: number | null;
}

export const organisationApi = {
  getRegions: async (): Promise<Region[]> => {
    const res = await apiClient.get<any>('/organisation/regions?pageSize=100');
    const payload = res.data?.data || res.data;
    return Array.isArray(payload) ? payload : [];
  },

  getDistricts: async (regionId?: string): Promise<District[]> => {
    const params = new URLSearchParams();
    params.set('pageSize', '100');
    if (regionId) params.set('regionId', regionId);
    const res = await apiClient.get<any>(`/organisation/districts?${params.toString()}`);
    const payload = res.data?.data || res.data;
    return Array.isArray(payload) ? payload : [];
  },

  createDistrict: async (payload: CreateDistrictPayload): Promise<District> => {
    const res = await apiClient.post<District>('/organisation/districts', payload);
    return res.data;
  },

  getBranches: async (): Promise<Branch[]> => {
    const res = await apiClient.get<Branch[]>('/organisation/branches');
    return res.data;
  },

  getBranch: async (id: string): Promise<Branch> => {
    const res = await apiClient.get<Branch>(`/organisation/branches/${id}`);
    return res.data;
  },

  createBranch: async (payload: CreateBranchPayload): Promise<Branch> => {
    const res = await apiClient.post<Branch>('/organisation/branches', payload);
    return res.data;
  },

  updateBranch: async (id: string, payload: UpdateBranchPayload): Promise<Branch> => {
    const res = await apiClient.put<Branch>(`/organisation/branches/${id}`, payload);
    return res.data;
  },

  toggleBranchStatus: async (id: string): Promise<{ success: boolean; isActive: boolean }> => {
    const res = await apiClient.patch<{ success: boolean; isActive: boolean }>(`/organisation/branches/${id}/toggle-status`);
    return res.data;
  },
};

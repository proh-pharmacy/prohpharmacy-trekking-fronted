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

export interface Branch {
  id: string;
  name: string;
  districtId: string;
  districtName?: string;
  regionName?: string;
  address: string;
  phoneNumber: string;
  isActive: boolean;
  createdAt?: string;
}

export interface CreateDistrictPayload {
  name: string;
  regionId: string;
}

export interface CreateBranchPayload {
  name: string;
  districtId: string;
  address: string;
  phoneNumber: string;
}

export interface UpdateBranchPayload {
  name: string;
  address: string;
  phoneNumber: string;
}

export const organisationApi = {
  getRegions: async (): Promise<Region[]> => {
    const res = await apiClient.get<Region[]>('/organisation/regions');
    return res.data;
  },

  getDistricts: async (regionId?: string): Promise<District[]> => {
    const url = regionId ? `/organisation/districts?regionId=${encodeURIComponent(regionId)}` : '/organisation/districts';
    const res = await apiClient.get<District[]>(url);
    return res.data;
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

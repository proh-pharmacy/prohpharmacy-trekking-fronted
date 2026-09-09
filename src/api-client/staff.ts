import apiClient from './api';
import type { PaginatedDataResponse } from '../components/data-table';

export type StaffStatus = 'Pending' | 'Active' | 'Suspended' | 'Offboarded';

export interface StaffItem {
  id: string;
  employeeNumber?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phoneNumber?: string;
  emailAddress?: string;
  email?: string;
  branchId?: string;
  branchName?: string;
  role?: string;
  jobTitle?: string;
  systemRoles?: string[];
  joinedOn?: string;
  employmentStatus?: StaffStatus | string;
  status?: StaffStatus | string;
  hasAppAccess?: boolean;
  profilePhotoUrl?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface StaffQueryParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  branchId?: string;
  status?: string;
  hasAppAccess?: boolean;
  sort?: string;
}

export interface CreateStaffPayload {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  emailAddress: string;
  branchId: string;
  joinedOn?: string;
  role?: string;
  employeeNumber?: string;
  grantAppAccess?: boolean;
  initialPassword?: string;
}

export interface CreateStaffResponse extends StaffItem {
  initialPassword?: string;
}

export interface UpdateStaffPayload {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  branchId: string;
  role?: string;
}

export interface ChangeStaffStatusResponse {
  staffMemberId?: string;
  employmentStatus?: string;
  appAccessRevoked?: boolean;
  message?: string;
}

export interface GrantStaffAccessPayload {
  role?: string;
  roleNames?: string[];
  initialPassword?: string;
}

export const staffApi = {
  getStaff: async (params?: StaffQueryParams): Promise<PaginatedDataResponse<StaffItem>> => {
    const res = await apiClient.get<any>('/staff', { params });
    const payload = res.data;

    if (Array.isArray(payload)) {
      return {
        data: payload,
        totalCount: payload.length,
        totalPages: 1,
        currentPage: 1,
        pageSize: payload.length || 20,
      };
    }

    const items: StaffItem[] = (payload?.data || []).map((s: any) => ({
      id: String(s.id || s.staffMemberId || ''),
      employeeNumber: s.employeeNumber || s.staffNumber,
      firstName: s.firstName || '',
      lastName: s.lastName || '',
      fullName: s.fullName || [s.firstName, s.lastName].filter(Boolean).join(' ') || 'Staff Member',
      phoneNumber: s.phoneNumber || s.phone || '',
      emailAddress: s.emailAddress || s.email || '',
      email: s.emailAddress || s.email || '',
      branchId: s.branchId,
      branchName: s.branchName || '—',
      role: s.role || s.jobTitle || 'Staff',
      jobTitle: s.jobTitle || s.role || 'Staff',
      systemRoles: Array.isArray(s.systemRoles) ? s.systemRoles : s.role ? [s.role] : [],
      joinedOn: s.joinedOn,
      employmentStatus: s.employmentStatus || s.status || 'Active',
      status: s.employmentStatus || s.status || 'Active',
      hasAppAccess: s.hasAppAccess ?? false,
      profilePhotoUrl: s.profilePhotoUrl || null,
      createdAt: s.createdAt || new Date().toISOString(),
      updatedAt: s.updatedAt || null,
    }));

    return {
      data: items,
      totalCount: payload?.totalCount ?? items.length,
      totalPages: payload?.totalPages ?? 1,
      currentPage: payload?.currentPage ?? 1,
      pageSize: payload?.pageSize ?? items.length,
    };
  },

  getStaffById: async (id: string): Promise<StaffItem> => {
    const res = await apiClient.get<any>(`/staff/${id}`);
    const s = res.data;
    return {
      id: String(s.id || s.staffMemberId || id),
      employeeNumber: s.employeeNumber || s.staffNumber,
      firstName: s.firstName || '',
      lastName: s.lastName || '',
      fullName: s.fullName || [s.firstName, s.lastName].filter(Boolean).join(' ') || 'Staff Member',
      phoneNumber: s.phoneNumber || s.phone || '',
      emailAddress: s.emailAddress || s.email || '',
      email: s.emailAddress || s.email || '',
      branchId: s.branchId,
      branchName: s.branchName || '—',
      role: s.role || s.jobTitle || 'Staff',
      jobTitle: s.jobTitle || s.role || 'Staff',
      systemRoles: Array.isArray(s.systemRoles) ? s.systemRoles : s.role ? [s.role] : [],
      joinedOn: s.joinedOn,
      employmentStatus: s.employmentStatus || s.status || 'Active',
      status: s.employmentStatus || s.status || 'Active',
      hasAppAccess: s.hasAppAccess ?? false,
      profilePhotoUrl: s.profilePhotoUrl || null,
      createdAt: s.createdAt || new Date().toISOString(),
      updatedAt: s.updatedAt || null,
    };
  },

  createStaff: async (payload: CreateStaffPayload): Promise<CreateStaffResponse> => {
    const res = await apiClient.post<CreateStaffResponse>('/staff', payload);
    return res.data;
  },

  updateStaff: async (id: string, payload: UpdateStaffPayload): Promise<StaffItem> => {
    const res = await apiClient.patch<StaffItem>(`/staff/${id}`, payload);
    return res.data;
  },

  changeStatus: async (id: string, status: string): Promise<ChangeStaffStatusResponse> => {
    const res = await apiClient.patch<ChangeStaffStatusResponse>(`/staff/${id}/status`, { status });
    return res.data;
  },

  grantAccess: async (id: string, payload: GrantStaffAccessPayload): Promise<any> => {
    const body: any = {
      staffMemberId: id,
    };
    if (payload.roleNames && payload.roleNames.length > 0) {
      body.roleNames = payload.roleNames;
    } else if (payload.role) {
      body.roleNames = [payload.role];
    }
    if (payload.initialPassword && payload.initialPassword.trim()) {
      body.initialPassword = payload.initialPassword.trim();
    }
    const res = await apiClient.post(`/staff/${id}/grant-access`, body);
    return res.data;
  },

  uploadPhoto: async (id: string, file: File): Promise<{ staffMemberId: string; profilePhotoUrl: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<{ staffMemberId: string; profilePhotoUrl: string }>(
      `/staff/${id}/photo`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return res.data;
  },
};

export default staffApi;

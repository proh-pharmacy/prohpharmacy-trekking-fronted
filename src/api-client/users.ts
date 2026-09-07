import apiClient from './api';

export type UserStatus = 'Active' | 'Pending' | 'Suspended';

export interface Role {
  id?: string;
  name: string;
  description?: string;
}

export interface UserItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  roles: string[];
  status: UserStatus;
  lastLoginAt?: string;
  createdAt: string;
}

export interface InviteUserPayload {
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

export interface UserQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}

export interface PaginatedUsersResponse {
  data: UserItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export const usersApi = {
  getRoles: async (): Promise<Role[]> => {
    const res = await apiClient.get<Role[]>('/roles');
    return res.data;
  },

  getUsers: async (params?: UserQueryParams): Promise<PaginatedUsersResponse> => {
    const res = await apiClient.get<PaginatedUsersResponse>('/users', { params });
    return res.data;
  },

  getUser: async (id: string): Promise<UserItem> => {
    const res = await apiClient.get<UserItem>(`/users/${id}`);
    return res.data;
  },

  inviteUser: async (payload: InviteUserPayload): Promise<{ id: string; message?: string }> => {
    const res = await apiClient.post<{ id: string; message?: string }>('/invitations', payload);
    return res.data;
  },

  resendInvitation: async (id: string): Promise<{ success: boolean; message?: string }> => {
    const res = await apiClient.post<{ success: boolean; message?: string }>(`/invitations/${id}/resend`);
    return res.data;
  },

  assignRole: async (userId: string, roleName: string): Promise<void> => {
    await apiClient.post(`/users/${userId}/roles`, { roleName });
  },

  removeRole: async (userId: string, roleName: string): Promise<void> => {
    await apiClient.delete(`/users/${userId}/roles/${encodeURIComponent(roleName)}`);
  },

  activateUser: async (id: string): Promise<void> => {
    await apiClient.post(`/users/${id}/activate`);
  },

  suspendUser: async (id: string): Promise<void> => {
    await apiClient.post(`/users/${id}/suspend`);
  },

  revokeSessions: async (id: string): Promise<void> => {
    await apiClient.post(`/users/${id}/revoke-sessions`);
  },

  adminResetPassword: async (id: string): Promise<{ message?: string }> => {
    const res = await apiClient.post<{ message?: string }>(`/users/${id}/reset-password`);
    return res.data;
  },
};

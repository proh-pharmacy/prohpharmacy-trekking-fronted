import apiClient from './api';

export type UserStatus = 'Active' | 'Pending' | 'Suspended';

export interface Role {
  id?: string;
  name: string;
  description?: string;
  permissions?: string[];
  isSystem?: boolean;
}

export interface RolePermissionItem {
  key: string;
  enabled: boolean;
}

export interface RolePermissionGroup {
  module: string;
  permissions: RolePermissionItem[];
}

export interface RolePermissionsResponse {
  roleId: string;
  roleName: string;
  description?: string;
  groups: RolePermissionGroup[];
}

export interface CreateRolePayload {
  name: string;
  description?: string;
  permissions?: string[];
}

export interface UserItem {
  id: string;
  userId?: string;
  email: string;
  emailAddress?: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  phoneNumber?: string;
  role?: string;
  roles: string[];
  systemRoles?: string[];
  status: UserStatus;
  employmentStatus?: string;
  isActive?: boolean;
  hasAppAccess?: boolean;
  staffMemberId?: string;
  staffId?: string;
  employeeNumber?: string;
  branchName?: string;
  branchId?: string;
  permissions?: string[];
  profilePhotoUrl?: string;
  currentDeviceId?: string;
  currentDeviceName?: string;
  joinedOn?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt?: string | null;
}

export interface InviteStaffPayload {
  staffMemberId: string;
  roleNames: string[];
  initialPassword?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  roles?: string[];
}

export type InviteUserPayload = InviteStaffPayload;

export interface InviteStaffResponse {
  staffMemberId?: string;
  staffFullName?: string;
  staffEmail?: string;
  roles?: string[];
  initialPassword?: string;
  id?: string;
  message?: string;
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

  createRole: async (payload: CreateRolePayload): Promise<Role> => {
    const res = await apiClient.post<Role>('/roles', payload);
    return res.data;
  },

  getRolePermissions: async (roleId: string): Promise<RolePermissionsResponse> => {
    const res = await apiClient.get<RolePermissionsResponse>(`/roles/${roleId}/permissions`);
    return res.data;
  },

  syncRolePermissions: async (roleId: string, permissions: string[]): Promise<any> => {
    const res = await apiClient.put<any>(`/roles/${roleId}/permissions`, { permissions });
    return res.data;
  },

  getUsers: async (params?: UserQueryParams): Promise<PaginatedUsersResponse> => {
    const res = await apiClient.get<any>('/users', { params });
    const payload = res.data;
    const rawList: any[] = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
      ? payload.data
      : [];

    const normalizedUsers: UserItem[] = rawList.map((u: any) => {
      const resolvedId = String(u.id || u.userId || '');
      let resolvedStatus: UserStatus = 'Active';
      const rawStatus = u.employmentStatus || u.status;
      if (rawStatus) {
        const s = String(rawStatus).toLowerCase();
        if (s === 'pending') resolvedStatus = 'Pending';
        else if (s === 'suspended' || s === 'offboarded') resolvedStatus = 'Suspended';
        else resolvedStatus = 'Active';
      } else if (u.isActive === false) {
        resolvedStatus = 'Suspended';
      } else if (u.isActive === true) {
        resolvedStatus = 'Active';
      }

      const resolvedEmail = String(u.emailAddress || u.email || '');
      const resolvedRoles: string[] = Array.isArray(u.systemRoles)
        ? u.systemRoles
        : Array.isArray(u.roles)
        ? u.roles
        : u.role
        ? [u.role]
        : [];

      return {
        id: resolvedId,
        userId: resolvedId,
        email: resolvedEmail,
        emailAddress: resolvedEmail,
        firstName: u.firstName || u.fullName?.split(' ')[0] || '',
        lastName: u.lastName || u.fullName?.split(' ').slice(1).join(' ') || '',
        fullName:
          u.fullName ||
          [u.firstName, u.lastName].filter(Boolean).join(' ') ||
          resolvedEmail ||
          'Unknown User',
        phoneNumber: u.phoneNumber || '',
        role: u.role || resolvedRoles[0] || '',
        roles: resolvedRoles,
        systemRoles: resolvedRoles,
        status: resolvedStatus,
        employmentStatus: u.employmentStatus || resolvedStatus,
        isActive: u.isActive ?? (resolvedStatus === 'Active'),
        hasAppAccess: u.hasAppAccess ?? true,
        staffMemberId: u.staffMemberId || u.staffId,
        staffId: u.staffId || u.staffMemberId,
        employeeNumber: u.employeeNumber,
        branchName: u.branchName,
        branchId: u.branchId,
        permissions: Array.isArray(u.permissions) ? u.permissions : [],
        profilePhotoUrl: u.profilePhotoUrl,
        currentDeviceId: u.currentDeviceId,
        currentDeviceName: u.currentDeviceName,
        joinedOn: u.joinedOn,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt || new Date().toISOString(),
        updatedAt: u.updatedAt ?? null,
      };
    });

    return {
      data: normalizedUsers,
      totalCount: payload?.totalCount ?? normalizedUsers.length,
      totalPages: payload?.totalPages ?? 1,
      currentPage: payload?.currentPage ?? 1,
      pageSize: payload?.pageSize ?? normalizedUsers.length,
    };
  },

  getUser: async (id: string): Promise<UserItem> => {
    const res = await apiClient.get<any>(`/users/${id}`);
    const u = res.data;
    const resolvedId = String(u.id || u.userId || id);
    let resolvedStatus: UserStatus = 'Active';
    const rawStatus = u.employmentStatus || u.status;
    if (rawStatus) {
      const s = String(rawStatus).toLowerCase();
      if (s === 'pending') resolvedStatus = 'Pending';
      else if (s === 'suspended' || s === 'offboarded') resolvedStatus = 'Suspended';
      else resolvedStatus = 'Active';
    } else if (u.isActive === false) {
      resolvedStatus = 'Suspended';
    }

    const resolvedEmail = String(u.emailAddress || u.email || '');
    const resolvedRoles: string[] = Array.isArray(u.systemRoles)
      ? u.systemRoles
      : Array.isArray(u.roles)
      ? u.roles
      : u.role
      ? [u.role]
      : [];

    return {
      id: resolvedId,
      userId: resolvedId,
      email: resolvedEmail,
      emailAddress: resolvedEmail,
      firstName: u.firstName || u.fullName?.split(' ')[0] || '',
      lastName: u.lastName || u.fullName?.split(' ').slice(1).join(' ') || '',
      fullName:
        u.fullName ||
        [u.firstName, u.lastName].filter(Boolean).join(' ') ||
        resolvedEmail ||
        'Unknown User',
      phoneNumber: u.phoneNumber || '',
      role: u.role || resolvedRoles[0] || '',
      roles: resolvedRoles,
      systemRoles: resolvedRoles,
      status: resolvedStatus,
      employmentStatus: u.employmentStatus || resolvedStatus,
      isActive: u.isActive ?? (resolvedStatus === 'Active'),
      hasAppAccess: u.hasAppAccess ?? true,
      staffMemberId: u.staffMemberId || u.staffId,
      staffId: u.staffId || u.staffMemberId,
      employeeNumber: u.employeeNumber,
      branchName: u.branchName,
      branchId: u.branchId,
      permissions: Array.isArray(u.permissions) ? u.permissions : [],
      profilePhotoUrl: u.profilePhotoUrl,
      currentDeviceId: u.currentDeviceId,
      currentDeviceName: u.currentDeviceName,
      joinedOn: u.joinedOn,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt || new Date().toISOString(),
      updatedAt: u.updatedAt ?? null,
    };
  },

  updateUser: async (id: string, payload: Partial<UserItem>): Promise<UserItem> => {
    const res = await apiClient.patch<any>(`/users/${id}`, payload).catch(async () => {
      // fallback to PUT if PATCH isn't supported
      return await apiClient.put<any>(`/users/${id}`, payload);
    });
    return res.data;
  },

  getStaffMembers: async (params?: { hasAppAccess?: boolean; status?: string; search?: string; pageNumber?: number; pageSize?: number }): Promise<any[]> => {
    try {
      const res = await apiClient.get<any>('/staff', { params });
      const payload = res.data;
      return Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
        ? payload.data
        : [];
    } catch {
      return [];
    }
  },

  inviteUser: async (payload: InviteStaffPayload): Promise<InviteStaffResponse> => {
    const body: any = { ...payload };
    if ('roles' in payload && payload.roles && !body.roleNames) {
      body.roleNames = payload.roles;
    }
    const res = await apiClient.post<InviteStaffResponse>('/invitations', body);
    return res.data;
  },

  resendInvitation: async (id: string): Promise<{ success: boolean; message?: string }> => {
    const res = await apiClient.post<{ success: boolean; message?: string }>(`/invitations/${id}/resend`);
    return res.data;
  },

  assignRoles: async (userId: string, roleNames: string[] | string): Promise<{ userId: string; roles: string[] }> => {
    const rolesArray = Array.isArray(roleNames) ? roleNames : [roleNames];
    const res = await apiClient.post<{ userId: string; roles: string[] }>(`/users/${userId}/roles`, {
      roleNames: rolesArray,
      roleName: typeof roleNames === 'string' ? roleNames : roleNames[0],
    });
    return res.data;
  },

  assignRole: async (userId: string, roleName: string): Promise<{ userId: string; roles: string[] }> => {
    return usersApi.assignRoles(userId, [roleName]);
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

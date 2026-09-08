import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { api, refreshTokensApi } from './api';
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  clearTokens,
} from './tokenStorage';
import type {
  AuthTokens,
  AuthUser,
  ChangePasswordPayload,
  LoginCredentials,
  ResetPasswordPayload,
} from '../types/auth';

export { refreshTokensApi };

/**
 * Exchange email and password for auth tokens.
 */
export const loginApi = async (credentials: LoginCredentials): Promise<AuthTokens> => {
  const response = await api.post<AuthTokens>('/auth/login', credentials);
  const data = response.data as unknown as Record<string, unknown>;
  const accessToken = String(data.accessToken || data.AccessToken || '');
  const refreshToken = String(data.refreshToken || data.RefreshToken || '');
  return {
    ...data,
    accessToken,
    refreshToken,
  } as unknown as AuthTokens;
};



/**
 * Fetch the currently authenticated user's profile from GET /auth/me.
 */
export const getCurrentUserApi = async (): Promise<AuthUser> => {
  const response = await api.get<any>('/auth/me');
  const d = response.data;
  const resolvedId = String(d.userId || d.id || '');
  const resolvedRoles: string[] = Array.isArray(d.systemRoles)
    ? d.systemRoles
    : Array.isArray(d.roles)
    ? d.roles
    : d.role
    ? [d.role]
    : [];
  const resolvedEmail = String(d.emailAddress || d.email || '');

  return {
    ...d,
    id: resolvedId,
    userId: resolvedId,
    email: resolvedEmail,
    emailAddress: resolvedEmail,
    fullName:
      d.fullName ||
      [d.firstName, d.lastName].filter(Boolean).join(' ') ||
      resolvedEmail,
    roles: resolvedRoles,
    systemRoles: resolvedRoles,
    permissions: Array.isArray(d.permissions) ? d.permissions : [],
    staffMemberId: d.staffMemberId || d.staffId,
    employeeNumber: d.employeeNumber,
    branchName: d.branchName,
    branchId: d.branchId,
    role: d.role || resolvedRoles[0],
    isActive:
      d.isActive ??
      (d.employmentStatus === 'Active' || d.status === 'Active'),
  };
};

/**
 * Invalidate session on backend.
 */
export const logoutApi = async (): Promise<void> => {
  try {
    await api.post('/auth/logout');
  } catch {
    // Ignore server error on logout; local state will be wiped regardless
  } finally {
    clearTokens();
  }
};

/**
 * Change current user password.
 */
export const changePasswordApi = async (payload: ChangePasswordPayload): Promise<void> => {
  await api.post('/auth/change-password', payload);
};

/**
 * Admin reset user password.
 */
export const resetPasswordApi = async (payload: ResetPasswordPayload): Promise<void> => {
  await api.post('/auth/reset-password', payload);
};

/* ==========================================================================
   TanStack React Query Hooks for the Auth Domain
   ========================================================================== */

export const AUTH_QUERY_KEY = ['auth', 'currentUser'] as const;

/**
 * Hook for executing login mutation.
 */
export const useLoginMutation = (
  options?: UseMutationOptions<AuthTokens, Error, LoginCredentials>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: loginApi,
    onSuccess: (data, variables, context) => {
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      // Invalidate currentUser query to re-fetch profile
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      if (options?.onSuccess) {
        (options.onSuccess as (d: AuthTokens, v: LoginCredentials, c: unknown) => void)(
          data,
          variables,
          context
        );
      }
    },
  });
};

/**
 * Hook for querying current authenticated user profile.
 */
export const useCurrentUserQuery = (
  options?: Partial<UseQueryOptions<AuthUser, Error, AuthUser>>
) => {
  const hasAuthToken = Boolean(getAccessToken() || getRefreshToken());

  return useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: getCurrentUserApi,
    enabled: hasAuthToken,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: false,
    ...options,
  });
};

/**
 * Hook for executing logout mutation.
 */
export const useLogoutMutation = (options?: UseMutationOptions<void, Error, void>) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: logoutApi,
    onSuccess: (data, variables, context) => {
      clearTokens();
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      queryClient.clear();
      if (options?.onSuccess) {
        (options.onSuccess as (d: void, v: void, c: unknown) => void)(data, variables, context);
      }
    },
  });
};

/**
 * Hook for changing authenticated user's password.
 */
export const useChangePasswordMutation = (
  options?: UseMutationOptions<void, Error, ChangePasswordPayload>
) => {
  return useMutation({
    mutationFn: changePasswordApi,
    ...options,
  });
};

/**
 * Hook for admin user password reset.
 */
export const useResetPasswordMutation = (
  options?: UseMutationOptions<void, Error, ResetPasswordPayload>
) => {
  return useMutation({
    mutationFn: resetPasswordApi,
    ...options,
  });
};

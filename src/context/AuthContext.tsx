import React, {
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  useCurrentUserQuery,
  useLoginMutation,
  useLogoutMutation,
  getRefreshToken,
  getAccessToken,
  registerAuthExpiredHandler,
  clearTokens,
  AUTH_QUERY_KEY,
} from '../api-client';
import type { LoginCredentials } from '../types/auth';
import { AuthContext, type AuthContextType } from './authContextDef';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const loginMutation = useLoginMutation();
  const logoutMutation = useLogoutMutation();

  const hasTokens = Boolean(getAccessToken() || getRefreshToken());

  const {
    data: user,
    isLoading: isUserLoading,
    isFetching: isUserFetching,
    refetch: refetchUser,
  } = useCurrentUserQuery({
    enabled: hasTokens,
  });

  // Handle silent expiration from axios interceptor
  useEffect(() => {
    registerAuthExpiredHandler((callbackUrl?: string) => {
      clearTokens();
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      if (typeof window !== 'undefined') {
        const target = callbackUrl
          ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
          : '/login';
        if (!window.location.pathname.startsWith('/login')) {
          toast.error('Session expired. Please sign in again.');
          window.location.href = target;
        }
      }
    });
  }, [queryClient]);


  const login = useCallback(
    async (credentials: LoginCredentials): Promise<void> => {
      await loginMutation.mutateAsync(credentials);
      await refetchUser();
    },
    [loginMutation, refetchUser]
  );

  const logout = useCallback(async (): Promise<void> => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  const roles = useMemo(() => user?.roles || user?.systemRoles || [], [user?.roles, user?.systemRoles]);
  const permissions = useMemo(() => user?.permissions || [], [user?.permissions]);

  const hasRole = useCallback(
    (role: string): boolean => {
      return roles.includes(role);
    },
    [roles]
  );

  const can = useCallback(
    (permission: string): boolean => {
      return permissions.includes(permission);
    },
    [permissions]
  );

  const isAdmin = useMemo(
    () => hasRole('SuperAdmin') || hasRole('Admin'),
    [hasRole]
  );
  const isManager = useMemo(
    () =>
      hasRole('BranchManager') ||
      hasRole('OperationsManager') ||
      hasRole('Manager') ||
      isAdmin,
    [hasRole, isAdmin]
  );
  const isStaff = useMemo(
    () =>
      hasRole('FieldStaff') ||
      hasRole('Staff') ||
      hasRole('Driver') ||
      hasRole('CreditOfficer') ||
      hasRole('Auditor') ||
      isManager,
    [hasRole, isManager]
  );

  const isAuthenticated = Boolean(user && hasTokens);
  const isLoading = Boolean(hasTokens && (isUserLoading || isUserFetching));

  const value = useMemo<AuthContextType>(
    () => ({
      user: user || null,
      isAuthenticated,
      isLoading,
      roles,
      permissions,
      hasRole,
      can,
      isAdmin,
      isManager,
      isStaff,
      login,
      logout,
    }),
    [
      user,
      isAuthenticated,
      isLoading,
      roles,
      permissions,
      hasRole,
      can,
      isAdmin,
      isManager,
      isStaff,
      login,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;

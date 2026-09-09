import React, {
  useState,
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
  setAccessToken,
  setRefreshToken,
  refreshTokensApi,
  isJwtExpired,
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

  const [isInitializing, setIsInitializing] = useState(true);

  // 1. App Boot Silent Refresh (Section 6 of 01-login-implementation.md)
  // When booting, if a refresh token exists and access token is missing or expired,
  // silently refresh before letting query and route guards evaluate.
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      const refreshToken = getRefreshToken();
      const accessToken = getAccessToken();

      if (refreshToken && (!accessToken || isJwtExpired(accessToken, 60))) {
        try {
          const tokenData = await refreshTokensApi(refreshToken);
          const newAccessToken = tokenData.accessToken;
          const newRefreshToken = tokenData.refreshToken;
          if (newAccessToken) setAccessToken(newAccessToken);
          if (newRefreshToken) setRefreshToken(newRefreshToken);
        } catch (err) {
          console.warn('[AuthProvider] App boot silent refresh failed:', err);
          clearTokens();
        }
      }

      if (mounted) {
        setIsInitializing(false);
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const hasTokens = Boolean(getAccessToken() || getRefreshToken());

  const {
    data: user,
    isLoading: isUserLoading,
    isFetching: isUserFetching,
    refetch: refetchUser,
  } = useCurrentUserQuery({
    enabled: !isInitializing && hasTokens,
  });

  // 2. Proactive Refresh Schedule (Section 1 of 01-login-implementation.md)
  // Schedule a silent refresh 60 seconds before access token expires
  useEffect(() => {
    if (isInitializing) return;

    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();
    if (!accessToken || !refreshToken) return;

    let delayMs = 14 * 60 * 1000;
    try {
      const parts = accessToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload.exp) {
          const expiresAtMs = payload.exp * 1000;
          const msUntilExpiry = expiresAtMs - Date.now();
          delayMs = Math.max(msUntilExpiry - 60000, 15000);
        }
      }
    } catch {
      // Fallback delay
    }

    const timer = setTimeout(async () => {
      const currentRefresh = getRefreshToken();
      if (currentRefresh) {
        try {
          const tokenData = await refreshTokensApi(currentRefresh);
          if (tokenData.accessToken) setAccessToken(tokenData.accessToken);
          if (tokenData.refreshToken) setRefreshToken(tokenData.refreshToken);
        } catch (err) {
          console.warn('[AuthProvider] Proactive refresh error:', err);
        }
      }
    }, delayMs);

    return () => clearTimeout(timer);
  }, [isInitializing, user]);

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
  const isLoading = isInitializing || Boolean(hasTokens && (isUserLoading || isUserFetching));

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

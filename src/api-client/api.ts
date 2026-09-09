import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  clearTokens,
  notifyAuthExpired,
  getLastRefreshTime,
  setLastRefreshTime,
  isJwtExpired,
} from './tokenStorage';

// Resolve and normalize base URL to guarantee /api/v1 prefix
const rawBaseURL: string = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1')
  .trim()
  .replace(/\/+$/, '');

export const baseURL: string = rawBaseURL.endsWith('/api/v1')
  ? rawBaseURL
  : rawBaseURL.endsWith('/api')
    ? `${rawBaseURL}/v1`
    : `${rawBaseURL}/api/v1`;

let activeRefreshPromise: Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  user?: any;
}> | null = null;

/**
 * Standalone direct call to refresh tokens without triggering interceptor loops.
 * Coordinated across concurrent in-app calls and multiple browser tabs.
 */
export const refreshTokensApi = async (
  tokenParam?: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn?: number; user?: any }> => {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
    const refreshToken = tokenParam || getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const performRefreshPost = async (tokenToSend: string) => {
      const response = await axios.post<{
        accessToken?: string;
        refreshToken?: string;
        AccessToken?: string;
        RefreshToken?: string;
        expiresIn?: number;
        user?: any;
      }>(
        `${baseURL}/auth/refresh`,
        { refreshToken: tokenToSend },
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          timeout: 15000,
        }
      );

      const raw = response.data;
      const accessToken = raw.accessToken || raw.AccessToken || '';
      const newRefreshToken = raw.refreshToken || raw.RefreshToken || '';

      if (!accessToken) {
        throw new Error('No access token returned from refresh endpoint');
      }

      setAccessToken(accessToken);
      if (newRefreshToken) {
        setRefreshToken(newRefreshToken);
      }
      setLastRefreshTime(Date.now());

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: raw.expiresIn,
        user: raw.user,
      };
    };

    // Cross-tab coordination: Use Web Locks if supported to prevent token rotation collision
    if (typeof navigator !== 'undefined' && navigator.locks) {
      return await navigator.locks.request('proh_auth_refresh_lock', async () => {
        const lastRefresh = getLastRefreshTime();
        const currentAccessToken = getAccessToken();
        const currentRefreshToken = getRefreshToken();

        // If another tab just refreshed the token within the last 6 seconds, reuse it
        if (
          lastRefresh &&
          Date.now() - lastRefresh < 6000 &&
          currentAccessToken &&
          !isJwtExpired(currentAccessToken, 30)
        ) {
          return {
            accessToken: currentAccessToken,
            refreshToken: currentRefreshToken || refreshToken,
          };
        }

        return await performRefreshPost(currentRefreshToken || refreshToken);
      });
    }

    return await performRefreshPost(refreshToken);
  })().finally(() => {
    activeRefreshPromise = null;
  });

  return activeRefreshPromise;
};

/**
 * Base Axios instance for all API requests across the application.
 * Component calls can use relative paths directly (e.g., api.post('/auth/login', ...))
 * without needing to repeat `/api/v1`.
 */
export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor: attach auth tokens and sanitize redundant /api/v1 prefix if provided
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Prevent accidental double prefix if caller passes '/api/v1/...'
    if (config.url) {
      if (config.url.startsWith('/api/v1/')) {
        config.url = config.url.replace('/api/v1', '');
      } else if (config.url.startsWith('api/v1/')) {
        config.url = config.url.replace('api/v1', '');
      }
    }

    // Attach in-memory access token (fallback to localStorage if present)
    const token = getAccessToken();
    if (token && config.headers) {
      if (typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/* ==========================================================================
   Silent Token Refresh Interceptor with Request Queueing
   (per docs/frontend/01-login-implementation.md section 4)
   ========================================================================== */

interface QueuedPromise {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

let isRefreshing = false;
let failedQueue: QueuedPromise[] = [];

const processQueue = (error: unknown, token: string | null = null): void => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    const url = originalRequest?.url || '';
    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('auth/login') ||
      url.includes('/auth/refresh') ||
      url.includes('auth/refresh');

    // Check if error is 401 Unauthorized, request exists, has not been retried yet, and not an auth endpoint
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      // If a refresh is already in progress, queue this request until completed
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest._retry = true;
              if (originalRequest.headers) {
                if (typeof originalRequest.headers.set === 'function') {
                  originalRequest.headers.set('Authorization', `Bearer ${token}`);
                } else {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
              }
              resolve(api(originalRequest));
            },
            reject: (err: unknown) => {
              reject(err);
            },
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      const currentPath =
        typeof window !== 'undefined'
          ? window.location.pathname + window.location.search
          : '';
      const callbackParam =
        currentPath && !currentPath.startsWith('/login') ? currentPath : undefined;

      if (!refreshToken) {
        isRefreshing = false;
        clearTokens();
        notifyAuthExpired(callbackParam);
        return Promise.reject(error);
      }

      try {
        const tokenData = await refreshTokensApi(refreshToken);
        const newAccessToken = tokenData.accessToken;

        if (originalRequest.headers) {
          if (typeof originalRequest.headers.set === 'function') {
            originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);
          } else {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
        }

        processQueue(null, newAccessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        notifyAuthExpired(callbackParam);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/** Anonymous axios instance — no auth interceptors. Use for public endpoints (driver portal). */
export const publicApi: AxiosInstance = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

export type { AxiosInstance, AxiosRequestConfig, AxiosResponse };
export default api;

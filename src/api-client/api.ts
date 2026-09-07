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

/**
 * Standalone direct call to refresh tokens without triggering interceptor loops.
 */
export const refreshTokensApi = async (
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn?: number }> => {
  const response = await axios.post<{
    accessToken: string;
    refreshToken: string;
    expiresIn?: number;
  }>(
    `${baseURL}/auth/refresh`,
    { refreshToken },
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 15000,
    }
  );
  return response.data;
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

    // Attach in-memory access token (fallback to legacy localStorage key if present)
    const token = getAccessToken() || localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
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

    // Check if error is 401 Unauthorized and not already retried
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      // If a refresh is already in progress, queue this request until completed
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(api(originalRequest));
            },
            reject,
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
        setAccessToken(tokenData.accessToken);
        setRefreshToken(tokenData.refreshToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${tokenData.accessToken}`;
        }

        processQueue(null, tokenData.accessToken);
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

export type { AxiosInstance, AxiosRequestConfig, AxiosResponse };
export default api;

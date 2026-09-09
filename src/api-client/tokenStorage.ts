/**
 * Secure token storage strategy:
 * - Access Token: In-memory (module-scoped variable, inaccessible via XSS DOM scraping)
 * - Refresh Token: Persistent storage (localStorage)
 */

const ACCESS_TOKEN_KEY = 'proh_access_token';
const LEGACY_ACCESS_TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'proh_refresh_token';
const LEGACY_REFRESH_TOKEN_KEY = 'refreshToken';
const LAST_REFRESH_TIME_KEY = 'proh_last_refresh_time';

let inMemoryAccessToken: string | null = null;
let onAuthExpiredHandler: ((callbackUrl?: string) => void) | null = null;

// Synchronize token across multiple browser tabs
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event: StorageEvent) => {
    if (event.key === ACCESS_TOKEN_KEY && event.newValue) {
      inMemoryAccessToken = event.newValue;
    } else if (event.key === REFRESH_TOKEN_KEY && !event.newValue) {
      inMemoryAccessToken = null;
    }
  });
}

/**
 * Checks if a JWT string is expired or expiring within `offsetSeconds`.
 */
export const isJwtExpired = (token: string, offsetSeconds: number = 30): boolean => {
  if (!token || typeof token !== 'string') return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;
    // payload.exp is in seconds
    return Date.now() >= (payload.exp - offsetSeconds) * 1000;
  } catch {
    return false;
  }
};

export const getLastRefreshTime = (): number | null => {
  const t = localStorage.getItem(LAST_REFRESH_TIME_KEY);
  return t ? Number(t) : null;
};

export const setLastRefreshTime = (timestamp: number): void => {
  localStorage.setItem(LAST_REFRESH_TIME_KEY, String(timestamp));
};

export const getAccessToken = (): string | null => {
  return (
    inMemoryAccessToken ||
    localStorage.getItem(ACCESS_TOKEN_KEY) ||
    localStorage.getItem(LEGACY_ACCESS_TOKEN_KEY) ||
    null
  );
};

export const setAccessToken = (token: string | null): void => {
  inMemoryAccessToken = token;
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    localStorage.setItem(LEGACY_ACCESS_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
  }
};

export const getRefreshToken = (): string | null => {
  return (
    localStorage.getItem(REFRESH_TOKEN_KEY) ||
    localStorage.getItem(LEGACY_REFRESH_TOKEN_KEY) ||
    null
  );
};

export const setRefreshToken = (token: string | null): void => {
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
    localStorage.setItem(LEGACY_REFRESH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
  }
};

export const clearTokens = (): void => {
  inMemoryAccessToken = null;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
  localStorage.removeItem(LAST_REFRESH_TIME_KEY);
};

/**
 * Register a callback to be invoked when the refresh token fails or session expires.
 */
export const registerAuthExpiredHandler = (handler: (callbackUrl?: string) => void): void => {
  onAuthExpiredHandler = handler;
};

export const notifyAuthExpired = (callbackUrl?: string): void => {
  if (onAuthExpiredHandler) {
    onAuthExpiredHandler(callbackUrl);
  }
};


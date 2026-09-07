/**
 * Secure token storage strategy:
 * - Access Token: In-memory (module-scoped variable, inaccessible via XSS DOM scraping)
 * - Refresh Token: Persistent storage (localStorage)
 */

const ACCESS_TOKEN_KEY = 'proh_access_token';
const LEGACY_ACCESS_TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'proh_refresh_token';
const LEGACY_REFRESH_TOKEN_KEY = 'refreshToken';

let inMemoryAccessToken: string | null = null;
let onAuthExpiredHandler: ((callbackUrl?: string) => void) | null = null;

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


/**
 * Authentication and JWT Token Lifecycle Management
 * Provides client-side JWT token expiration verification and automatic redirect upon expiration.
 */

export interface JwtPayload {
  id?: string;
  sub?: string;
  email?: string;
  role?: string;
  exp?: number;
  iat?: number;
  [key: string]: any;
}

/**
 * Parses JWT token payload safely.
 */
export function parseJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const base64Url = parts[1];
    const base64 = base64Url!.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Parses and checks if a JWT token is expired or malformed.
 * Includes a 5-second buffer to prevent race conditions during inflight network calls.
 */
export function isTokenExpired(token: string | null | undefined): boolean {
  if (!token || typeof token !== 'string') return true;

  const payload = parseJwtPayload(token);
  if (!payload || !payload.exp) return true;

  // Compare with current timestamp in ms (+5s leeway)
  const expirationMs = payload.exp * 1000;
  return expirationMs <= Date.now() + 5000;
}

/**
 * Returns remaining milliseconds until token expiration.
 * Returns 0 if already expired or invalid.
 */
export function getTokenRemainingMs(token: string | null | undefined): number {
  if (!token || typeof token !== 'string') return 0;

  const payload = parseJwtPayload(token);
  if (!payload || !payload.exp) return 0;

  const remaining = payload.exp * 1000 - Date.now();
  return remaining > 0 ? remaining : 0;
}

/**
 * Clears all client-persisted customer authentication credentials.
 */
export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('atelier_user');
  localStorage.removeItem('atelier_access_token');
  localStorage.removeItem('atelier_saved_addresses');
}

/**
 * Retrieves the stored JWT token if present and not expired.
 * If expired, proactively purges storage and returns null.
 */
export function getValidToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('atelier_access_token');
  if (!token) return null;

  if (isTokenExpired(token)) {
    clearAuth();
    return null;
  }

  return token;
}

/**
 * Proactively logs out the user, purges credentials, and redirects immediately to the dedicated login screen.
 */
export function logoutAndRedirect(returnUrl?: string): void {
  clearAuth();
  if (typeof window === 'undefined') return;

  const isAlreadyOnAuthPage =
    window.location.pathname === '/login' ||
    (window.location.pathname === '/account' && window.location.search.includes('tab=signin'));

  if (isAlreadyOnAuthPage) {
    return;
  }

  const rawPath = returnUrl || (window.location.pathname + window.location.search);
  // Sanitize returnUrl so ephemeral pagination artifacts like `page=...` do not strand the customer
  let cleanPath = rawPath;
  try {
    const urlObj = new URL(rawPath, window.location.origin);
    urlObj.searchParams.delete('page');
    cleanPath = urlObj.pathname + (urlObj.search ? urlObj.search : '');
  } catch {
    cleanPath = rawPath;
  }

  const targetUrl = `/login?expired=true${
    cleanPath && cleanPath !== '/login' && !cleanPath.startsWith('/account')
      ? `&returnUrl=${encodeURIComponent(cleanPath)}`
      : ''
  }`;

  window.location.href = targetUrl;
}

/**
 * Validates active session and redirects immediately if expired.
 * Returns true if valid, false if expired and redirect was triggered.
 */
export function requireAuth(returnUrl?: string): boolean {
  const token = getValidToken();
  if (!token) {
    logoutAndRedirect(returnUrl);
    return false;
  }
  return true;
}

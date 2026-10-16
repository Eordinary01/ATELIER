'use client';

import { useEffect } from 'react';
import { isTokenExpired, getTokenRemainingMs, logoutAndRedirect } from '../lib/auth';

/**
 * Global background session watcher.
 * Automatically detects token expiration anywhere on the site and redirects immediately
 * to the dedicated login page without requiring manual interaction or navigation.
 */
export function AuthWatcher() {
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const evaluateSession = () => {
      if (typeof window === 'undefined') return;

      const token = localStorage.getItem('atelier_access_token');
      // If no token exists, user is a guest
      if (!token) return;

      if (isTokenExpired(token)) {
        logoutAndRedirect();
        return;
      }

      // Schedule timer for exact moment of token expiration
      if (timeoutId) clearTimeout(timeoutId);
      const remainingMs = getTokenRemainingMs(token);
      if (remainingMs > 0 && remainingMs < 2147483647) {
        timeoutId = setTimeout(() => {
          logoutAndRedirect();
        }, remainingMs);
      }
    };

    // 1. Initial check upon component mount
    evaluateSession();

    // 2. Background polling every 4 seconds to handle laptop sleep/wake or background tab throttling
    const intervalId = setInterval(evaluateSession, 4000);

    // 3. Event listeners for tab focus, document visibility, and multi-tab synchronization
    window.addEventListener('focus', evaluateSession);
    document.addEventListener('visibilitychange', evaluateSession);
    window.addEventListener('storage', evaluateSession);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      clearInterval(intervalId);
      window.removeEventListener('focus', evaluateSession);
      document.removeEventListener('visibilitychange', evaluateSession);
      window.removeEventListener('storage', evaluateSession);
    };
  }, []);

  return null;
}

'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV === 'development') {
      // In development mode, unregister stale SW to prevent Webpack chunk hash collisions
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
      if ('caches' in window) {
        caches.keys().then((keys) => {
          for (const key of keys) {
            if (key.startsWith('atelier-static')) {
              caches.delete(key);
            }
          }
        });
      }
    } else {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Graceful fallback if Service Workers are restricted
      });
    }
  }, []);

  return null;
}

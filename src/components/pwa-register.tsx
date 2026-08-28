'use client';

import { useEffect } from 'react';

export function PWARegister() {
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator)
    ) {
      return;
    }
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      return;
    }

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && reg.active) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      } catch (err) {
        console.warn('Service worker registration failed:', err);
      }
    };

    register();
  }, []);

  return null;
}
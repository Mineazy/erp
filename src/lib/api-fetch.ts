'use client';

import { enqueueOfflineRequest } from './db';

export class OfflineQueuedError extends Error {
  queued = true;
  constructor() {
    super('Queued offline');
  }
}

export interface ApiFetchOptions extends RequestInit {
  offlineFallback?: boolean;
}

/**
 * Drop-in fetch replacement for the ERP client.
 *
 * - GET requests rely on the service worker's cache (network-first with
 *   cache fallback), so previously-viewed data renders while offline.
 * - Non-GET requests made while the browser is offline are queued to the
 *   IndexedDB outbox and replayed by SyncManager on reconnect. The caller
 *   receives an OfflineQueuedError so it can optimistically update the UI.
 * - When `offlineFallback` is set for a GET and the network fails without a
 *   cached copy, a standalone `Response` returning `{error:'offline'}` is
 *   produced instead of throwing.
 */
export async function apiFetch(input: RequestInfo | URL, init?: ApiFetchOptions): Promise<Response> {
  const opts = init || {};
  const method = (opts.method || 'GET').toUpperCase();

  if (method !== 'GET') {
    const online = typeof navigator !== 'undefined' && navigator.onLine !== false;
    if (!online) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const payload = opts.body && typeof opts.body === 'string' ? JSON.parse(opts.body) : opts.body;
      await enqueueOfflineRequest(url, method, payload ?? {});
      throw new OfflineQueuedError();
    }
  }

  try {
    return await fetch(input, opts);
  } catch (err) {
    if (method === 'GET' && opts.offlineFallback) {
      return new Response(JSON.stringify({ error: 'offline', offline: true }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    throw err;
  }
}
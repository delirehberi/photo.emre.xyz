/**
 * Astro Middleware: Edge Caching & Security Headers
 * photo.emre.xyz
 *
 * Implements Cloudflare Edge Caching for SSR routes and API endpoints,
 * attaches production-grade HTTP security headers, and applies
 * Stale-While-Revalidate (SWR) cache policies.
 */

import { defineMiddleware } from 'astro:middleware';
import {
  getSharedEdgeCache,
  DEFAULT_CACHE_CONFIG,
} from './lib/cache/edge-cache';
import {
  SECURITY_HEADERS,
  normalizePath,
  isCacheableRoute,
} from './lib/security/headers';

export { SECURITY_HEADERS, normalizePath, isCacheableRoute };

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url } = context;
  const edgeCache = getSharedEdgeCache();
  const cacheable = isCacheableRoute(url.pathname, request.method);

  // 1. Check Edge Cache for cacheable GET requests
  if (cacheable) {
    try {
      const cachedResponse = await edgeCache.match(request);
      if (cachedResponse) {
        const headers = new Headers(cachedResponse.headers);
        headers.set('X-Cache', 'HIT');

        // Apply security headers to cached response
        for (const [header, val] of Object.entries(SECURITY_HEADERS)) {
          if (!headers.has(header)) {
            headers.set(header, val);
          }
        }

        return new Response(cachedResponse.body, {
          status: cachedResponse.status,
          statusText: cachedResponse.statusText,
          headers,
        });
      }
    } catch (err) {
      console.warn('Middleware edge cache lookup error:', err);
    }
  }

  // 2. Process request via downstream handlers
  const response = await next();

  // 3. Inject Security Headers
  const responseHeaders = new Headers(response.headers);
  for (const [header, val] of Object.entries(SECURITY_HEADERS)) {
    if (!responseHeaders.has(header)) {
      responseHeaders.set(header, val);
    }
  }

  // 4. Handle non-cacheable routes (Admin, Mutations)
  if (!cacheable) {
    const path = normalizePath(url.pathname);
    if (path.startsWith('/admin') || path.startsWith('/api/admin')) {
      responseHeaders.set(
        'Cache-Control',
        'private, no-cache, no-store, must-revalidate',
      );
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  }

  // 5. Apply SWR and Cache-Control on cacheable responses (status 200)
  if (response.status === 200) {
    const rawCacheControl = responseHeaders.get('Cache-Control');
    const isExplicitlyUncacheable =
      rawCacheControl &&
      (rawCacheControl.includes('no-store') ||
        rawCacheControl.includes('no-cache') ||
        rawCacheControl.includes('private'));

    if (isExplicitlyUncacheable) {
      responseHeaders.set('X-Cache', 'BYPASS');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    }

    if (!rawCacheControl) {
      responseHeaders.set(
        'Cache-Control',
        `public, max-age=${DEFAULT_CACHE_CONFIG.CLIENT_MAX_AGE}, s-maxage=${DEFAULT_CACHE_CONFIG.S_MAX_AGE}, stale-while-revalidate=${DEFAULT_CACHE_CONFIG.STALE_WHILE_REVALIDATE}`,
      );
    }
    responseHeaders.set('X-Cache', 'MISS');

    const cacheableResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

    // Populate edge cache asynchronously in the background
    try {
      await edgeCache.put(request, cacheableResponse.clone());
    } catch (cacheErr) {
      console.warn('Middleware edge cache save error:', cacheErr);
    }

    return cacheableResponse;
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
});

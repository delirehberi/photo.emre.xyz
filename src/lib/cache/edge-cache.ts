/**
 * Cloudflare Cache API & Edge Cache Management
 * photo.emre.xyz
 *
 * Implements edge caching abstraction leveraging Cloudflare's `caches.default`
 * with Stale-While-Revalidate (SWR) headers, key normalization, and instant
 * edge invalidation for zero-database Nostr relay payloads and SSR pages.
 */

import { resolveAlbumTarget, encodeAlbumNaddr } from '@/lib/nostr/identifiers';

export interface CacheOptions {
  /** Edge time-to-live in seconds (s-maxage) */
  sMaxAge?: number;
  /** Stale-while-revalidate duration in seconds */
  staleWhileRevalidate?: number;
  /** Browser/client max-age in seconds */
  clientMaxAge?: number;
}

export const DEFAULT_CACHE_CONFIG = {
  S_MAX_AGE: 60,
  STALE_WHILE_REVALIDATE: 300,
  CLIENT_MAX_AGE: 0,
} as const;

export interface CacheEntry {
  response: Response;
  expiresAt: number;
}

/**
 * Normalizes a URL or path to a canonical cache key URL.
 */
export function normalizeCacheKey(
  urlOrPath: string,
  origin = 'https://photo.emre.xyz',
): string {
  try {
    const parsed = new URL(urlOrPath, origin);
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return `${origin.replace(/\/+$/, '')}/${urlOrPath.replace(/^\/+/, '')}`;
  }
}

/**
 * Builds standard Cache-Control headers for edge caching with SWR.
 */
export function buildEdgeCacheHeaders(options: CacheOptions = {}): Headers {
  const sMaxAge = options.sMaxAge ?? DEFAULT_CACHE_CONFIG.S_MAX_AGE;
  const swr =
    options.staleWhileRevalidate ?? DEFAULT_CACHE_CONFIG.STALE_WHILE_REVALIDATE;
  const clientMaxAge =
    options.clientMaxAge ?? DEFAULT_CACHE_CONFIG.CLIENT_MAX_AGE;

  const headers = new Headers();
  headers.set(
    'Cache-Control',
    `public, max-age=${clientMaxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`,
  );
  return headers;
}

export class EdgeCacheManager {
  private memoryCache = new Map<string, CacheEntry>();
  public readonly maxMemoryEntries: number;

  constructor(maxMemoryEntries = 500) {
    this.maxMemoryEntries = maxMemoryEntries;
  }

  /**
   * Retrieves Cloudflare's default cache instance if available.
   */
  private getCfCache(): Cache | null {
    if (
      typeof caches !== 'undefined' &&
      (caches as unknown as { default?: Cache }).default
    ) {
      return (caches as unknown as { default: Cache }).default;
    }
    return null;
  }

  /**
   * Matches a request against the edge cache.
   */
  public async match(request: Request | string): Promise<Response | null> {
    const key =
      typeof request === 'string' ? normalizeCacheKey(request) : request;
    const cfCache = this.getCfCache();

    if (cfCache) {
      try {
        const cached = await cfCache.match(key);
        if (cached) {
          return cached;
        }
      } catch (err) {
        console.warn(
          'EdgeCacheManager: Error reading from Cloudflare Cache API:',
          err,
        );
      }
    }

    // Fallback: In-memory cache for development/test runtimes
    const urlString =
      typeof request === 'string' ? normalizeCacheKey(request) : request.url;
    const memoryEntry = this.memoryCache.get(urlString);
    if (memoryEntry) {
      if (Date.now() < memoryEntry.expiresAt) {
        // Promote accessed key to most recent in LRU order
        this.memoryCache.delete(urlString);
        this.memoryCache.set(urlString, memoryEntry);
        return memoryEntry.response.clone();
      }
      this.memoryCache.delete(urlString);
    }

    return null;
  }

  /**
   * Caches a response in the edge cache.
   */
  public async put(
    request: Request | string,
    response: Response,
    options: CacheOptions = {},
  ): Promise<void> {
    if (response.status !== 200) {
      return;
    }
    if (typeof request !== 'string' && request.method !== 'GET') {
      return;
    }
    if (response.headers.has('Set-Cookie')) {
      return;
    }

    // Never cache responses marked private, no-store, or no-cache
    const existingCacheControl = response.headers.get('Cache-Control');
    if (
      existingCacheControl &&
      (existingCacheControl.includes('no-store') ||
        existingCacheControl.includes('no-cache') ||
        existingCacheControl.includes('private'))
    ) {
      return;
    }

    const sMaxAge = options.sMaxAge ?? DEFAULT_CACHE_CONFIG.S_MAX_AGE;
    const swr =
      options.staleWhileRevalidate ??
      DEFAULT_CACHE_CONFIG.STALE_WHILE_REVALIDATE;
    const clientMaxAge =
      options.clientMaxAge ?? DEFAULT_CACHE_CONFIG.CLIENT_MAX_AGE;

    const headers = new Headers(response.headers);
    if (!headers.has('Cache-Control')) {
      headers.set(
        'Cache-Control',
        `public, max-age=${clientMaxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`,
      );
    }

    const cacheableResponse = new Response(response.clone().body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });

    const key =
      typeof request === 'string' ? normalizeCacheKey(request) : request;
    const cfCache = this.getCfCache();

    if (cfCache) {
      try {
        await cfCache.put(key, cacheableResponse.clone());
      } catch (err) {
        console.warn(
          'EdgeCacheManager: Error writing to Cloudflare Cache API:',
          err,
        );
      }
    }

    const urlString =
      typeof request === 'string' ? normalizeCacheKey(request) : request.url;

    // LRU eviction: if at capacity and key doesn't exist, remove oldest (first) entry
    if (
      !this.memoryCache.has(urlString) &&
      this.memoryCache.size >= this.maxMemoryEntries
    ) {
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey !== undefined) {
        this.memoryCache.delete(oldestKey);
      }
    }

    // Insert or update position
    this.memoryCache.delete(urlString);
    this.memoryCache.set(urlString, {
      response: cacheableResponse.clone(),
      expiresAt: Date.now() + (sMaxAge + swr) * 1000,
    });
  }

  /**
   * Returns current count of entries in in-memory fallback cache.
   */
  public getMemorySize(): number {
    return this.memoryCache.size;
  }

  /**
   * Deletes a cached entry from the edge cache.
   */
  public async delete(requestOrUrl: Request | string): Promise<boolean> {
    const key =
      typeof requestOrUrl === 'string'
        ? normalizeCacheKey(requestOrUrl)
        : requestOrUrl;
    let deleted = false;

    const cfCache = this.getCfCache();
    if (cfCache) {
      try {
        deleted = await cfCache.delete(key);
      } catch (err) {
        console.warn(
          'EdgeCacheManager: Error deleting from Cloudflare Cache API:',
          err,
        );
      }
    }

    const urlString =
      typeof requestOrUrl === 'string'
        ? normalizeCacheKey(requestOrUrl)
        : requestOrUrl.url;
    if (this.memoryCache.delete(urlString)) {
      deleted = true;
    }

    return deleted;
  }

  /**
   * Invalidates all edge cache entries associated with an album coordinate or slug,
   * including album detail pages and directory/listing views.
   */
  public async invalidateCoordinate(
    coordinateOrSlug: string,
    origin = 'https://photo.emre.xyz',
  ): Promise<string[]> {
    const purgedUrls: string[] = [];

    const pathsToPurge: string[] = [
      `/album/${coordinateOrSlug}`,
      `/en/album/${coordinateOrSlug}`,
      '/',
      '/en',
      '/events',
      '/en/events',
    ];

    if (coordinateOrSlug.includes(':')) {
      const parts = coordinateOrSlug.split(':');
      const dTag = parts[parts.length - 1];
      if (dTag) {
        pathsToPurge.push(`/album/${dTag}`);
        pathsToPurge.push(`/en/album/${dTag}`);
      }
    }

    try {
      const resolved = resolveAlbumTarget(coordinateOrSlug);
      if (resolved.pubkey && resolved.dTag) {
        const naddr = encodeAlbumNaddr({
          pubkey: resolved.pubkey,
          dTag: resolved.dTag,
        });
        pathsToPurge.push(`/album/${naddr}`);
        pathsToPurge.push(`/en/album/${naddr}`);
      }
      if (resolved.dTag) {
        pathsToPurge.push(`/album/${resolved.dTag}`);
        pathsToPurge.push(`/en/album/${resolved.dTag}`);
      }
    } catch {
      // Ignore identifier resolution error during purge
    }

    for (const path of pathsToPurge) {
      const fullUrl = normalizeCacheKey(path, origin);
      await this.delete(fullUrl);
      purgedUrls.push(fullUrl);
    }

    return purgedUrls;
  }

  /**
   * Clears the in-memory fallback cache (primarily for tests).
   */
  public clearMemory(): void {
    this.memoryCache.clear();
  }
}

/**
 * Singleton edge cache manager instance.
 */
let sharedEdgeCache: EdgeCacheManager | null = null;

export function getSharedEdgeCache(): EdgeCacheManager {
  if (!sharedEdgeCache) {
    sharedEdgeCache = new EdgeCacheManager();
  }
  return sharedEdgeCache;
}

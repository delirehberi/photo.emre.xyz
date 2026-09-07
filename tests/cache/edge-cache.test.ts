import { describe, it, expect, beforeEach } from 'vitest';
import {
  EdgeCacheManager,
  normalizeCacheKey,
  buildEdgeCacheHeaders,
  DEFAULT_CACHE_CONFIG,
} from '../../src/lib/cache/edge-cache';

describe('EdgeCacheManager & Cache Helpers', () => {
  let cacheManager: EdgeCacheManager;

  beforeEach(() => {
    cacheManager = new EdgeCacheManager();
    cacheManager.clearMemory();
  });

  describe('normalizeCacheKey', () => {
    it('normalizes relative path into absolute canonical URL', () => {
      const key = normalizeCacheKey('/album/berlin-2026');
      expect(key).toBe('https://photo.emre.xyz/album/berlin-2026');
    });

    it('strips hash fragments while preserving query parameters', () => {
      const key = normalizeCacheKey(
        'https://photo.emre.xyz/album/berlin-2026?photo=abc#details',
      );
      expect(key).toBe('https://photo.emre.xyz/album/berlin-2026?photo=abc');
    });

    it('handles custom origins', () => {
      const key = normalizeCacheKey('/test', 'https://custom.media.xyz');
      expect(key).toBe('https://custom.media.xyz/test');
    });
  });

  describe('buildEdgeCacheHeaders', () => {
    it('builds default SWR cache control headers', () => {
      const headers = buildEdgeCacheHeaders();
      const cc = headers.get('Cache-Control');
      expect(cc).toContain(`s-maxage=${DEFAULT_CACHE_CONFIG.S_MAX_AGE}`);
      expect(cc).toContain(
        `stale-while-revalidate=${DEFAULT_CACHE_CONFIG.STALE_WHILE_REVALIDATE}`,
      );
    });

    it('accepts custom TTL options', () => {
      const headers = buildEdgeCacheHeaders({
        sMaxAge: 120,
        staleWhileRevalidate: 600,
        clientMaxAge: 10,
      });
      const cc = headers.get('Cache-Control');
      expect(cc).toBe(
        'public, max-age=10, s-maxage=120, stale-while-revalidate=600',
      );
    });
  });

  describe('EdgeCacheManager Lifecycle', () => {
    it('returns null on cache miss', async () => {
      const res = await cacheManager.match('/album/non-existent');
      expect(res).toBeNull();
    });

    it('caches and retrieves successful 200 GET responses', async () => {
      const url = 'https://photo.emre.xyz/album/demo-album';
      const originalResponse = new Response(
        JSON.stringify({ title: 'Demo Album' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );

      await cacheManager.put(url, originalResponse);

      const cached = await cacheManager.match(url);
      expect(cached).not.toBeNull();
      expect(cached?.status).toBe(200);

      const data = await cached?.json();
      expect(data).toEqual({ title: 'Demo Album' });
    });

    it('does not cache non-200 responses', async () => {
      const url = 'https://photo.emre.xyz/album/404-album';
      const errorResponse = new Response('Not Found', { status: 404 });

      await cacheManager.put(url, errorResponse);
      const cached = await cacheManager.match(url);
      expect(cached).toBeNull();
    });

    it('does not cache responses containing Set-Cookie', async () => {
      const url = 'https://photo.emre.xyz/album/cookie-album';
      const cookieResponse = new Response('OK', {
        status: 200,
        headers: { 'Set-Cookie': 'session=abc' },
      });

      await cacheManager.put(url, cookieResponse);
      const cached = await cacheManager.match(url);
      expect(cached).toBeNull();
    });

    it('deletes cached entries properly', async () => {
      const url = 'https://photo.emre.xyz/album/to-delete';
      const response = new Response('OK', { status: 200 });

      await cacheManager.put(url, response);
      expect(await cacheManager.match(url)).not.toBeNull();

      const deleted = await cacheManager.delete(url);
      expect(deleted).toBe(true);
      expect(await cacheManager.match(url)).toBeNull();
    });

    it('invalidates coordinate and expands corresponding URLs', async () => {
      const coordinate =
        '31922:46f3c7bb33cc3019049b76dc89dbb96e34c247bdda68b6ad8632682793ff8a1a:berlin-summit';
      const slugUrl = 'https://photo.emre.xyz/album/berlin-summit';

      await cacheManager.put(
        slugUrl,
        new Response('Album Page', { status: 200 }),
      );
      expect(await cacheManager.match(slugUrl)).not.toBeNull();

      const purged = await cacheManager.invalidateCoordinate(coordinate);
      expect(purged).toContain(slugUrl);
      expect(await cacheManager.match(slugUrl)).toBeNull();
    });

    it('enforces LRU capacity limit and evicts oldest entries', async () => {
      const smallCache = new EdgeCacheManager(3);
      smallCache.clearMemory();

      await smallCache.put(
        'https://photo.emre.xyz/page-1',
        new Response('1', { status: 200 }),
      );
      await smallCache.put(
        'https://photo.emre.xyz/page-2',
        new Response('2', { status: 200 }),
      );
      await smallCache.put(
        'https://photo.emre.xyz/page-3',
        new Response('3', { status: 200 }),
      );

      expect(smallCache.getMemorySize()).toBe(3);

      // Access page-1 to promote it in LRU order
      const page1 = await smallCache.match('https://photo.emre.xyz/page-1');
      expect(page1).not.toBeNull();

      // Now insert page-4; page-2 should be evicted because page-1 was recently accessed
      await smallCache.put(
        'https://photo.emre.xyz/page-4',
        new Response('4', { status: 200 }),
      );

      expect(smallCache.getMemorySize()).toBe(3);
      expect(
        await smallCache.match('https://photo.emre.xyz/page-2'),
      ).toBeNull(); // evicted!
      expect(
        await smallCache.match('https://photo.emre.xyz/page-1'),
      ).not.toBeNull(); // retained!
      expect(
        await smallCache.match('https://photo.emre.xyz/page-3'),
      ).not.toBeNull(); // retained!
      expect(
        await smallCache.match('https://photo.emre.xyz/page-4'),
      ).not.toBeNull(); // retained!
    });
  });
});

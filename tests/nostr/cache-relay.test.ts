import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateSecretKey, finalizeEvent } from 'nostr-tools/pure';
import type { SimplePool } from 'nostr-tools/pool';
import {
  CACHE_RELAY_URL,
  DEFAULT_RELAYS,
  PRIMARY_RELAY,
  getCacheRelayUrl,
  resolveReadRelays,
} from '../../src/lib/nostr/config';
import { RelayPoolManager } from '../../src/lib/nostr/pool';

describe('Nostr Cache Relay Engine', () => {
  const secretKey = generateSecretKey();

  describe('getCacheRelayUrl', () => {
    it('formats a single cache relay URL with comma-separated upstream relays', () => {
      const upstreams = [
        'wss://relay.damus.io',
        'wss://nos.lol',
        'wss://relay.primal.net',
      ];
      const result = getCacheRelayUrl(upstreams, 'wss://cache.nostr.org.tr');
      expect(result).toBe(
        'wss://cache.nostr.org.tr?relays=wss://relay.damus.io,wss://nos.lol,wss://relay.primal.net',
      );
    });

    it('defaults to DEFAULT_RELAYS when no upstreams are provided', () => {
      const result = getCacheRelayUrl([], 'wss://cache.nostr.org.tr');
      expect(result).toContain('wss://cache.nostr.org.tr?relays=');
      expect(result).toContain(PRIMARY_RELAY);
    });

    it('deduplicates upstream relays and sanitizes trailing slashes', () => {
      const upstreams = [
        'wss://relay.damus.io/',
        'wss://relay.damus.io',
        'wss://nos.lol/',
      ];
      const result = getCacheRelayUrl(upstreams, 'wss://cache.nostr.org.tr/');
      expect(result).toBe(
        'wss://cache.nostr.org.tr?relays=wss://relay.damus.io,wss://nos.lol',
      );
    });

    it('prevents nested cache URL recursion if an input relay is already a cache relay URL', () => {
      const upstreams = [
        'wss://cache.nostr.org.tr?relays=wss://relay.damus.io,wss://nos.lol',
        'wss://relay.primal.net',
      ];
      const result = getCacheRelayUrl(upstreams, 'wss://cache.nostr.org.tr');
      expect(result).toBe(
        'wss://cache.nostr.org.tr?relays=wss://relay.damus.io,wss://nos.lol,wss://relay.primal.net',
      );
    });

    it('filters out non-websocket or invalid URLs', () => {
      const upstreams = [
        'https://invalid.com',
        '',
        'wss://valid-relay.com',
        'ws://local-relay:8080',
      ];
      const result = getCacheRelayUrl(upstreams, 'wss://cache.nostr.org.tr');
      expect(result).toBe(
        'wss://cache.nostr.org.tr?relays=wss://valid-relay.com,ws://local-relay:8080',
      );
    });
  });

  describe('resolveReadRelays', () => {
    it('returns a single-element array with the parameterized cache relay URL when cache is active', () => {
      const resolved = resolveReadRelays(DEFAULT_RELAYS, true);
      expect(resolved).toHaveLength(1);
      expect(resolved[0]).toMatch(/^wss:\/\/cache\.nostr\.org\.tr\?relays=/);
      expect(resolved[0]).toContain(PRIMARY_RELAY);
    });

    it('returns raw target relays when useCache is false', () => {
      const targetRelays = ['wss://relay.damus.io', 'wss://nos.lol'];
      const resolved = resolveReadRelays(targetRelays, false);
      expect(resolved).toEqual(targetRelays);
    });
  });

  describe('RelayPoolManager read-routing through Cache Relay', () => {
    let mockSimplePool: SimplePool;

    beforeEach(() => {
      mockSimplePool = {
        querySync: vi.fn(),
        get: vi.fn(),
        publish: vi.fn(),
        close: vi.fn(),
        destroy: vi.fn(),
      } as unknown as SimplePool;
    });

    it('routes queryEvents through the cache relay URL by default', async () => {
      const event = finalizeEvent(
        {
          kind: 1,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: 'Test Event from Cache Relay',
        },
        secretKey,
      );

      vi.mocked(mockSimplePool.querySync).mockResolvedValue([event]);

      const manager = new RelayPoolManager(mockSimplePool);
      const testRelays = ['wss://relay1.com', 'wss://relay2.com'];
      const results = await manager.queryEvents(testRelays, { kinds: [1] });

      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe(event.id);

      // Verify that querySync was called with the single aggregated cache relay URL
      expect(mockSimplePool.querySync).toHaveBeenCalledWith(
        [`${CACHE_RELAY_URL}?relays=wss://relay1.com,wss://relay2.com`],
        { kinds: [1] },
      );
    });

    it('bypasses cache relay when useCacheRelay is explicitly set to false', async () => {
      const event = finalizeEvent(
        {
          kind: 1,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: 'Direct Relay Query',
        },
        secretKey,
      );

      vi.mocked(mockSimplePool.querySync).mockResolvedValue([event]);

      const manager = new RelayPoolManager(mockSimplePool);
      const testRelays = ['wss://relay1.com', 'wss://relay2.com'];
      await manager.queryEvents(
        testRelays,
        { kinds: [1] },
        { useCacheRelay: false },
      );

      expect(mockSimplePool.querySync).toHaveBeenCalledWith(testRelays, {
        kinds: [1],
      });
    });

    it('routes queryOne through the cache relay URL by default', async () => {
      const event = finalizeEvent(
        {
          kind: 0,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: JSON.stringify({ name: 'Cache Relay Profile' }),
        },
        secretKey,
      );

      vi.mocked(mockSimplePool.get).mockResolvedValue(event);

      const manager = new RelayPoolManager(mockSimplePool);
      const testRelays = ['wss://relay1.com'];
      const result = await manager.queryOne(testRelays, { kinds: [0] });

      expect(result).not.toBeNull();
      expect(result?.id).toBe(event.id);
      expect(mockSimplePool.get).toHaveBeenCalledWith(
        [`${CACHE_RELAY_URL}?relays=wss://relay1.com`],
        { kinds: [0] },
      );
    });

    it('preserves direct upstream relays when publishing events', async () => {
      const event = finalizeEvent(
        {
          kind: 1,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: 'Publish Directly to Upstreams',
        },
        secretKey,
      );

      const directRelays = ['wss://relay1.com', 'wss://relay2.com'];
      vi.mocked(mockSimplePool.publish).mockReturnValue([
        Promise.resolve('OK'),
        Promise.resolve('OK'),
      ]);

      const manager = new RelayPoolManager(mockSimplePool);
      const report = await manager.publishEvent(event, directRelays);

      expect(report.successfulRelays).toEqual(directRelays);
      // Ensure publish was called with the direct relays, NOT transformed into cache URL
      expect(mockSimplePool.publish).toHaveBeenCalledWith(directRelays, event);
    });

    it('passes cache relay URL to subscribeEose when present on pool', async () => {
      const event = finalizeEvent(
        {
          kind: 1,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: 'SubscribeEose Cache Relay Test',
        },
        secretKey,
      );

      const mockCloser = { close: vi.fn() };
      const subscribeEoseMock = vi
        .fn()
        .mockImplementation((_relays, _filter, params) => {
          params.onevent(event);
          params.onclose();
          return mockCloser;
        });

      const poolWithSubscribeEose = {
        ...mockSimplePool,
        subscribeEose: subscribeEoseMock,
      } as unknown as SimplePool;

      const manager = new RelayPoolManager(poolWithSubscribeEose);
      const testRelays = ['wss://relay1.com', 'wss://relay2.com'];
      const results = await manager.queryEvents(testRelays, { kinds: [1] });

      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe(event.id);
      expect(subscribeEoseMock).toHaveBeenCalledWith(
        [`${CACHE_RELAY_URL}?relays=wss://relay1.com,wss://relay2.com`],
        { kinds: [1] },
        expect.any(Object),
      );
    });
  });
});

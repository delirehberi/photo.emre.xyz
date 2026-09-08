import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateSecretKey, finalizeEvent } from 'nostr-tools/pure';
import type { SimplePool } from 'nostr-tools/pool';
import { RelayPoolManager, getSharedRelayPool } from '../../src/lib/nostr/pool';
import { DEFAULT_RELAYS, PRIMARY_RELAY } from '../../src/lib/nostr/config';
import type { NostrEvent } from '../../src/lib/nostr/types';

describe('RelayPoolManager', () => {
  let mockSimplePool: SimplePool;
  const secretKey = generateSecretKey();

  beforeEach(() => {
    mockSimplePool = {
      querySync: vi.fn(),
      get: vi.fn(),
      publish: vi.fn(),
      close: vi.fn(),
      destroy: vi.fn(),
    } as unknown as SimplePool;
  });

  it('provides a shared singleton pool', () => {
    const p1 = getSharedRelayPool();
    const p2 = getSharedRelayPool();
    expect(p1).toBe(p2);
  });

  it('deduplicates events with identical IDs across relays', async () => {
    const event = finalizeEvent(
      {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: 'Hello Nostr',
      },
      secretKey,
    );

    // Simulate multiple relays returning the exact same event
    vi.mocked(mockSimplePool.querySync).mockResolvedValue([
      event,
      event,
      { ...event },
    ]);

    const manager = new RelayPoolManager(mockSimplePool);
    const results = await manager.queryEvents(DEFAULT_RELAYS, { kinds: [1] });

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe(event.id);
  });

  it('filters out cryptographically forged events when verifySignatures is enabled', async () => {
    const validEvent = finalizeEvent(
      {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: 'Valid event',
      },
      secretKey,
    );

    const forgedEvent: NostrEvent = JSON.parse(
      JSON.stringify({
        ...validEvent,
        id: 'forged-id',
        sig: '00'.repeat(64),
      }),
    );

    vi.mocked(mockSimplePool.querySync).mockResolvedValue([
      validEvent,
      forgedEvent,
    ]);

    const manager = new RelayPoolManager(mockSimplePool);
    const results = await manager.queryEvents(
      DEFAULT_RELAYS,
      { kinds: [1] },
      { verifySignatures: true },
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe(validEvent.id);
  });

  it('queryOne returns a verified event or null', async () => {
    const validEvent = finalizeEvent(
      {
        kind: 0,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: JSON.stringify({ name: 'emre' }),
      },
      secretKey,
    );

    vi.mocked(mockSimplePool.get).mockResolvedValue(validEvent);

    const manager = new RelayPoolManager(mockSimplePool);
    const result = await manager.queryOne([PRIMARY_RELAY], { kinds: [0] });

    expect(result).not.toBeNull();
    expect(result?.id).toBe(validEvent.id);
  });

  it('queryOne returns null when no event found or query times out', async () => {
    vi.mocked(mockSimplePool.get).mockResolvedValue(null);

    const manager = new RelayPoolManager(mockSimplePool);
    const result = await manager.queryOne([PRIMARY_RELAY], { kinds: [0] });

    expect(result).toBeNull();
  });

  it('publishEvent reports successful and failed relays', async () => {
    const event = finalizeEvent(
      {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: 'Broadcast test',
      },
      secretKey,
    );

    const relays = ['wss://relay1.com', 'wss://relay2.com'];
    vi.mocked(mockSimplePool.publish).mockReturnValue([
      Promise.resolve('OK'),
      Promise.reject(new Error('Relay blocked')),
    ]);

    const manager = new RelayPoolManager(mockSimplePool);
    const report = await manager.publishEvent(event, relays);

    expect(report.successfulRelays).toContain('wss://relay1.com');
    expect(report.failedRelays).toContain('wss://relay2.com');
  });

  it('handles empty relays list gracefully without error', async () => {
    const manager = new RelayPoolManager(mockSimplePool);
    const events = await manager.queryEvents([], { kinds: [1] });
    expect(events).toEqual([]);

    const single = await manager.queryOne([], { kinds: [1] });
    expect(single).toBeNull();
  });

  it('uses subscribeEose to progressively collect events and returns events even on timeout', async () => {
    const event1 = finalizeEvent(
      {
        kind: 31922,
        created_at: 1000,
        tags: [['d', 'event-1']],
        content: '',
      },
      secretKey,
    );

    const mockCloser = { close: vi.fn() };
    const poolWithSubscribeEose = {
      ...mockSimplePool,
      subscribeEose: vi.fn().mockImplementation((_relays, _filter, params) => {
        // Relay 1 delivers event immediately
        params.onevent(event1);
        // But onclose is never called before timeout (simulating a slow hanging remote relay)
        return mockCloser;
      }),
    } as unknown as SimplePool;

    const manager = new RelayPoolManager(poolWithSubscribeEose);
    const results = await manager.queryEvents(
      ['wss://relay.emre.xyz', 'wss://slow-relay.com'],
      { kinds: [31922] },
      { timeoutMs: 50 },
    );

    // Events delivered by fast relay are retained rather than discarded!
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe(event1.id);
    expect(mockCloser.close).toHaveBeenCalled();
  });

  it('uses subscribe in queryOne to resolve first matching event immediately and close subscription', async () => {
    const event = finalizeEvent(
      {
        kind: 0,
        created_at: 1000,
        tags: [],
        content: JSON.stringify({ name: 'emre' }),
      },
      secretKey,
    );

    const mockCloser = { close: vi.fn() };
    const poolWithSubscribe = {
      ...mockSimplePool,
      subscribe: vi.fn().mockImplementation((_relays, _filter, params) => {
        params.onevent(event);
        return mockCloser;
      }),
    } as unknown as SimplePool;

    const manager = new RelayPoolManager(poolWithSubscribe);
    const result = await manager.queryOne(['wss://relay.emre.xyz'], {
      kinds: [0],
    });

    expect(result).not.toBeNull();
    expect(result?.id).toBe(event.id);
    expect(mockCloser.close).toHaveBeenCalled();
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import type { APIContext } from 'astro';
import { finalizeEvent } from 'nostr-tools/pure';
import { POST } from '../../src/pages/api/cache/invalidate';
import { generateNostrKeypair } from '../../src/lib/nostr/keys';
import { getSharedEdgeCache } from '../../src/lib/cache/edge-cache';

describe('POST /api/cache/invalidate', () => {
  const edgeCache = getSharedEdgeCache();

  beforeEach(() => {
    edgeCache.clearMemory();
  });

  it('returns 400 when request body is not valid JSON', async () => {
    const mockContext = {
      request: new Request('https://photo.emre.xyz/api/cache/invalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json',
      }),
      locals: {},
    } as unknown as APIContext;

    const response = await POST(mockContext);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Invalid JSON');
  });

  it('returns 401 when no authorization event or header is provided', async () => {
    const mockContext = {
      request: new Request('https://photo.emre.xyz/api/cache/invalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coordinate: '31922:abc:test' }),
      }),
      locals: {},
    } as unknown as APIContext;

    const response = await POST(mockContext);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toContain('Missing authorization');
  });

  it('returns 403 when authorization signature is invalid', async () => {
    const keypair = generateNostrKeypair();
    const template = {
      kind: 27235,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['u', 'https://photo.emre.xyz/api/cache/invalidate'],
        ['method', 'POST'],
      ],
      content: 'Invalidate cache',
    };
    const signedEvent = finalizeEvent(template, keypair.secretKey);
    // Tamper with signature
    signedEvent.sig = 'f'.repeat(128);

    const mockContext = {
      request: new Request('https://photo.emre.xyz/api/cache/invalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coordinate: '31922:abc:test',
          authEvent: signedEvent,
        }),
      }),
      locals: {},
    } as unknown as APIContext;

    const response = await POST(mockContext);
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain('signature');
  });

  it('returns 403 when non-admin user attempts to invalidate another pubkeys coordinate', async () => {
    const authorKeypair = generateNostrKeypair();
    const otherPubkey = 'a'.repeat(64);
    const template = {
      kind: 27235,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['u', 'https://photo.emre.xyz/api/cache/invalidate'],
        ['method', 'POST'],
      ],
      content: 'Invalidate cache',
    };
    const signedEvent = finalizeEvent(template, authorKeypair.secretKey);

    const mockContext = {
      request: new Request('https://photo.emre.xyz/api/cache/invalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coordinate: `31922:${otherPubkey}:some-album`,
          authEvent: signedEvent,
        }),
      }),
      locals: {},
    } as unknown as APIContext;

    const response = await POST(mockContext);
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain('Forbidden');
  });

  it('returns 200 and purges cache entries when author invalidates own coordinate', async () => {
    const authorKeypair = generateNostrKeypair();
    const slug = 'berlin-event-2026';
    const coordinate = `31922:${authorKeypair.pubkey}:${slug}`;
    const slugUrl = `https://photo.emre.xyz/album/${slug}`;

    // Prime the cache with both album and directory entries
    const eventsUrl = 'https://photo.emre.xyz/events';
    await edgeCache.put(slugUrl, new Response('Cached Album', { status: 200 }));
    await edgeCache.put(
      eventsUrl,
      new Response('Cached Events', { status: 200 }),
    );
    expect(await edgeCache.match(slugUrl)).not.toBeNull();
    expect(await edgeCache.match(eventsUrl)).not.toBeNull();

    const template = {
      kind: 27235,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['u', 'https://photo.emre.xyz/api/cache/invalidate'],
        ['method', 'POST'],
      ],
      content: 'Invalidate cache',
    };
    const signedEvent = finalizeEvent(template, authorKeypair.secretKey);

    const mockContext = {
      request: new Request('https://photo.emre.xyz/api/cache/invalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coordinate,
          paths: ['/album/berlin-event-2026'],
          authEvent: signedEvent,
        }),
      }),
      locals: {},
    } as unknown as APIContext;

    const response = await POST(mockContext);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.purgedCount).toBeGreaterThan(0);

    // Verify both album and events directory cache entries are purged
    expect(await edgeCache.match(slugUrl)).toBeNull();
    expect(await edgeCache.match(eventsUrl)).toBeNull();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { APIContext } from 'astro';
import { GET } from '../../src/pages/api/download/[hash]';
import { getSharedRelayPool } from '../../src/lib/nostr/pool';
import type { NostrEvent } from '../../src/lib/nostr/types';

describe('/api/download/:hash', () => {
  const validHash = 'a'.repeat(64);
  const invalidHash = 'invalid-hash-123';
  const pool = getSharedRelayPool();

  beforeEach(() => {
    vi.restoreAllMocks();
    // Default safe mock for pool queries
    vi.spyOn(pool, 'queryOne').mockResolvedValue(null);
    vi.spyOn(pool, 'queryEvents').mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 400 Bad Request if hash parameter is invalid', async () => {
    const mockContext = {
      params: { hash: invalidHash },
      request: new Request(`http://localhost/api/download/${invalidHash}`),
      locals: {},
    } as unknown as APIContext;

    const response = await GET(mockContext);
    expect(response.status).toBe(400);
    const json = (await response.json()) as { error: string };
    expect(json.error).toMatch(/Invalid or missing SHA-256/);
  });

  it('returns 404 Not Found if Blossom upstream does not have the blob', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(null, { status: 404 }),
    );

    const mockContext = {
      params: { hash: validHash },
      request: new Request(`http://localhost/api/download/${validHash}`),
      locals: {},
    } as unknown as APIContext;

    const response = await GET(mockContext);
    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.error).toMatch(/Media not found/);
  });

  it('executes full pipeline with relay metadata resolution and watermark headers', async () => {
    const validPubkey = 'b'.repeat(64);
    const mockPhotoEvent = {
      id: 'photo-1',
      pubkey: validPubkey,
      kind: 1063,
      created_at: 1000,
      tags: [
        ['url', `https://media.emre.xyz/${validHash}`],
        ['x', validHash],
        ['m', 'image/jpeg'],
        ['dim', '1920x1080'],
        ['a', `31922:${validPubkey}:summer-vibes`],
      ],
      content: '',
      sig: 'sig-1',
    };

    const mockProfileEvent = {
      id: 'profile-1',
      pubkey: validPubkey,
      kind: 0,
      created_at: 1000,
      tags: [],
      content: JSON.stringify({
        name: 'emre',
        display_name: 'Emre Yılmaz',
        nip05: 'emre@emre.xyz',
      }),
      sig: 'sig-2',
    };

    vi.spyOn(pool, 'queryOne').mockImplementation(async (_relays, filter) => {
      if (filter.kinds?.includes(1063)) {
        return mockPhotoEvent as unknown as NostrEvent;
      }
      if (filter.kinds?.includes(0)) {
        return mockProfileEvent as unknown as NostrEvent;
      }
      return null;
    });

    // Mock Blossom server response with 4-byte buffer
    const fakeImageData = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(fakeImageData, {
        status: 200,
        headers: { 'Content-Type': 'image/jpeg' },
      }),
    );

    const mockContext = {
      params: { hash: validHash },
      request: new Request(`http://localhost/api/download/${validHash}`),
      locals: {},
    } as unknown as APIContext;

    const response = await GET(mockContext);
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=31536000, immutable',
    );
    expect(response.headers.get('X-Content-Owner')).toBe(validPubkey);
    expect(response.headers.get('X-Watermark-Label')).toBe('emre@emre.xyz');
    expect(response.headers.get('Content-Disposition')).toContain(
      `${validHash}-watermarked`,
    );
  });
});

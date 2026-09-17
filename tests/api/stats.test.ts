import { describe, it, expect, vi } from 'vitest';
import type { APIContext } from 'astro';
import { GET, HEAD, OPTIONS, buildStatsPayload } from '../../src/pages/stats';
import { APP_VERSION } from '../../src/lib/version';
import * as eventsData from '../../src/lib/nostr/events-data';

describe('/stats Endpoint', () => {
  it('GET returns 200 OK with comprehensive JSON telemetry payload', async () => {
    const mockContext = {
      request: new Request('http://localhost/stats'),
      locals: {},
    } as unknown as APIContext;

    const response = await GET(mockContext);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Cache-Control')).toContain('max-age=60');

    const json = (await response.json()) as {
      status: string;
      version: string;
      platform: { name: string; license: string };
      stats: {
        totalAlbums: number;
        curatedAlbums: number;
        totalPhotos: number;
        totalOrganizers: number;
      };
      network: {
        relays: { count: number; activeList: string[] };
        blossomServers: { count: number };
        supportedKinds: Array<{ kind: number; name: string }>;
      };
      caching: { edgeCached: boolean };
    };

    expect(json.status).toBe('ok');
    expect(json.version).toBe(APP_VERSION);
    expect(json.platform.name).toBe('Phoem');
    expect(json.platform.license).toBe('MIT');
    expect(json.stats.totalAlbums).toBeGreaterThanOrEqual(0);
    expect(json.stats.totalPhotos).toBeGreaterThanOrEqual(0);
    expect(json.network.relays.count).toBeGreaterThan(0);
    expect(json.network.blossomServers.count).toBeGreaterThan(0);
    expect(json.network.supportedKinds.length).toBeGreaterThan(0);
    expect(json.caching.edgeCached).toBe(true);
  });

  it('HEAD returns 200 OK with caching and CORS headers', async () => {
    const mockContext = {
      request: new Request('http://localhost/stats', { method: 'HEAD' }),
      locals: {},
    } as unknown as APIContext;

    const response = await HEAD(mockContext);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Cache-Control')).toBeDefined();
    const body = await response.text();
    expect(body).toBe('');
  });

  it('OPTIONS returns 204 No Content for CORS preflight', async () => {
    const mockContext = {
      request: new Request('http://localhost/stats', { method: 'OPTIONS' }),
      locals: {},
    } as unknown as APIContext;

    const response = await OPTIONS(mockContext);
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain(
      'GET',
    );
    expect(response.headers.get('Access-Control-Max-Age')).toBe('86400');
  });

  it('buildStatsPayload gracefully computes aggregated statistics from event items', async () => {
    vi.spyOn(eventsData, 'fetchEventAlbums').mockResolvedValueOnce([
      {
        album: {
          id: 'test-event-1',
          pubkey: 'pubkey111',
          title: 'Test Album 1',
          summary: 'Summary 1',
          tags: [],
          dTag: 'test-1',
          coordinate: '31922:pubkey111:test-1',
          createdAt: 1700000000,
          startDate: 1700001000,
          isCurated: true,
        },
        org: null,
        photoCount: 15,
      },
      {
        album: {
          id: 'test-event-2',
          pubkey: 'pubkey222',
          title: 'Test Album 2',
          summary: 'Summary 2',
          tags: [],
          dTag: 'test-2',
          coordinate: '31922:pubkey222:test-2',
          createdAt: 1700002000,
          startDate: 1700003000,
          isCurated: false,
        },
        org: null,
        photoCount: 25,
      },
    ]);

    const payload = await buildStatsPayload('test');
    expect(payload.status).toBe('ok');
    expect(payload.environment).toBe('test');
    expect(payload.stats.totalAlbums).toBe(2);
    expect(payload.stats.curatedAlbums).toBe(1);
    expect(payload.stats.totalPhotos).toBe(40);
    expect(payload.stats.totalOrganizers).toBe(2);
    expect(payload.stats.latestEventTimestamp).toBe(1700003000);
    expect(payload.stats.latestEventDate).toBe('2023-11-14');
  });

  it('buildStatsPayload recovers gracefully if fetchEventAlbums throws an error', async () => {
    vi.spyOn(eventsData, 'fetchEventAlbums').mockRejectedValueOnce(
      new Error('Relay pool timeout'),
    );

    const payload = await buildStatsPayload('production');
    expect(payload.status).toBe('ok');
    expect(payload.stats.totalAlbums).toBe(0);
    expect(payload.stats.curatedAlbums).toBe(0);
    expect(payload.stats.totalPhotos).toBe(0);
    expect(payload.stats.totalOrganizers).toBe(0);
  });
});

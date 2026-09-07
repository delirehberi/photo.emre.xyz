import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  DEFAULT_BLOSSOM_SERVER_URL,
  CURATED_BLOSSOM_SERVERS,
  normalizeBlossomUrl,
  isValidBlossomUrl,
  checkBlossomServerConnectivity,
} from '../../src/lib/blossom/servers';

describe('Blossom Servers Registry & Utilities', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets blossom.primal.net as the default server', () => {
    expect(DEFAULT_BLOSSOM_SERVER_URL).toBe('https://blossom.primal.net');
    const defaultOption = CURATED_BLOSSOM_SERVERS.find((s) => s.isDefault);
    expect(defaultOption).toBeDefined();
    expect(defaultOption?.url).toBe('https://blossom.primal.net');
  });

  it('includes media.nostr.org.tr marked for community members', () => {
    const nostrTr = CURATED_BLOSSOM_SERVERS.find(
      (s) => s.url === 'https://media.nostr.org.tr',
    );
    expect(nostrTr).toBeDefined();
    expect(nostrTr?.requiresMembership).toBe(true);
    expect(nostrTr?.name).toContain('Nostr Türkiye');
  });

  it('includes media.emre.xyz marked for authorized orgs and admin', () => {
    const emreXyz = CURATED_BLOSSOM_SERVERS.find(
      (s) => s.url === 'https://media.emre.xyz',
    );
    expect(emreXyz).toBeDefined();
    expect(emreXyz?.isPrivate).toBe(true);
    expect(emreXyz?.tag).toContain('Yetkili Org & Admin');
  });

  it('normalizes raw Blossom URLs accurately', () => {
    expect(normalizeBlossomUrl('blossom.example.com///')).toBe(
      'https://blossom.example.com',
    );
    expect(normalizeBlossomUrl('http://my-node.local:8080/')).toBe(
      'http://my-node.local:8080',
    );
    expect(normalizeBlossomUrl('')).toBe(DEFAULT_BLOSSOM_SERVER_URL);
  });

  it('validates Blossom URLs correctly', () => {
    expect(isValidBlossomUrl('https://blossom.primal.net')).toBe(true);
    expect(isValidBlossomUrl('http://localhost:3000')).toBe(true);
    expect(isValidBlossomUrl('media.nostr.org.tr')).toBe(true);
    expect(isValidBlossomUrl('invalid://url')).toBe(false);
    expect(isValidBlossomUrl('')).toBe(false);
    expect(isValidBlossomUrl(null as unknown as string)).toBe(false);
  });

  it('checks connectivity via HEAD request successfully', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(null, { status: 200 }),
    );

    const isHealthy = await checkBlossomServerConnectivity(
      'https://blossom.primal.net',
    );
    expect(isHealthy).toBe(true);
  });

  it('handles unreachable server gracefully in checkBlossomServerConnectivity', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
      new Error('Connection refused'),
    );

    const isHealthy = await checkBlossomServerConnectivity(
      'https://unreachable.blossom.node',
    );
    expect(isHealthy).toBe(false);
  });
});

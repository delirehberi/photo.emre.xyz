import { describe, it, expect } from 'vitest';
import type { APIContext } from 'astro';
import { finalizeEvent } from 'nostr-tools/pure';
import { GET, POST } from '../../src/pages/api/admin/verify';
import { createAdminChallengeTemplate } from '../../src/lib/nostr/admin';
import { generateNostrKeypair } from '../../src/lib/nostr/keys';

describe('/api/admin/verify', () => {
  it('GET returns a fresh challenge with timestamp and expiration', async () => {
    const mockContext = {
      request: new Request('http://localhost/api/admin/verify'),
      locals: {},
    } as unknown as APIContext;

    const response = await GET(mockContext);
    expect(response.status).toBe(200);

    const json = (await response.json()) as {
      challenge: string;
      timestamp: number;
      expiresAt: number;
    };

    expect(json.challenge).toBeDefined();
    expect(json.timestamp).toBeGreaterThan(0);
    expect(json.expiresAt).toBeGreaterThan(json.timestamp);
  });

  it('POST returns 400 when body is malformed or missing parameters', async () => {
    const mockContext = {
      request: new Request('http://localhost/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
      locals: {},
    } as unknown as APIContext;

    const response = await POST(mockContext);
    expect(response.status).toBe(400);
    const json = (await response.json()) as { error: string };
    expect(json.error).toContain('Missing required fields');
  });

  it('POST returns 401 when signed challenge does not match ADMIN_PUBKEY', async () => {
    const nonAdminKeypair = generateNostrKeypair();
    const challenge = 'photo-admin-challenge:1700000000:nonce123';
    const template = createAdminChallengeTemplate(challenge);
    const signedEvent = finalizeEvent(template, nonAdminKeypair.secretKey);

    const mockContext = {
      request: new Request('http://localhost/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: signedEvent, challenge }),
      }),
      locals: {},
    } as unknown as APIContext;

    const response = await POST(mockContext);
    expect(response.status).toBe(401);
    const json = (await response.json()) as { error: string; valid: boolean };
    expect(json.valid).toBe(false);
    expect(json.error).toContain('Unauthorized pubkey');
  });
});

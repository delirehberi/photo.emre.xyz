import { describe, it, expect } from 'vitest';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import {
  createNip98EventTemplate,
  generateNip98AuthHeader,
  validateNip98Token,
  createBlossomAuthEventTemplate,
  generateBlossomAuthHeader,
  decodeBase64,
} from '../../src/lib/blossom/auth';

describe('NIP-98 Authorization (Kind 27235)', () => {
  const secretKey = generateSecretKey();
  const publicKey = getPublicKey(secretKey);
  const testUrl = 'https://media.emre.xyz/upload';
  const testSha256 =
    '80ea288dbde526dd5e27a6e11894d0774641e7cb7609a066b579122049d5a999';

  it('correctly creates an unsigned EventTemplate with tags', () => {
    const template = createNip98EventTemplate({
      url: testUrl,
      method: 'PUT',
      sha256: testSha256,
    });

    expect(template.kind).toBe(27235);
    expect(template.tags).toContainEqual(['u', testUrl]);
    expect(template.tags).toContainEqual(['method', 'PUT']);
    expect(template.tags).toContainEqual(['x', testSha256]);
    expect(typeof template.created_at).toBe('number');
  });

  it('generates a valid Authorization header with Uint8Array private key', async () => {
    const authHeader = await generateNip98AuthHeader(
      {
        url: testUrl,
        method: 'PUT',
        sha256: testSha256,
      },
      secretKey,
    );

    expect(authHeader.startsWith('Nostr ')).toBe(true);
    const token = authHeader.replace('Nostr ', '');
    const decodedJson = decodeBase64(token);
    const event = JSON.parse(decodedJson);

    expect(event.pubkey).toBe(publicKey);
    expect(event.kind).toBe(27235);
    expect(event.sig).toBeDefined();
    expect(event.id).toBeDefined();
  });

  it('validates a correct Authorization header token', async () => {
    const authHeader = await generateNip98AuthHeader(
      {
        url: testUrl,
        method: 'PUT',
        sha256: testSha256,
      },
      secretKey,
    );

    const validated = await validateNip98Token(authHeader, testUrl, 'PUT', {
      expectedSha256: testSha256,
    });

    expect(validated.pubkey).toBe(publicKey);
    expect(validated.kind).toBe(27235);
  });

  it('fails validation when target URL mismatches', async () => {
    const authHeader = await generateNip98AuthHeader(
      {
        url: testUrl,
        method: 'PUT',
      },
      secretKey,
    );

    await expect(
      validateNip98Token(authHeader, 'https://other.domain/upload', 'PUT'),
    ).rejects.toThrow(/URL mismatch/);
  });

  it('fails validation when HTTP method mismatches', async () => {
    const authHeader = await generateNip98AuthHeader(
      {
        url: testUrl,
        method: 'GET',
      },
      secretKey,
    );

    await expect(
      validateNip98Token(authHeader, testUrl, 'PUT'),
    ).rejects.toThrow(/method mismatch/);
  });

  it('fails validation when SHA-256 hash mismatches', async () => {
    const authHeader = await generateNip98AuthHeader(
      {
        url: testUrl,
        method: 'PUT',
        sha256: testSha256,
      },
      secretKey,
    );

    await expect(
      validateNip98Token(authHeader, testUrl, 'PUT', {
        expectedSha256:
          '1111111111111111111111111111111111111111111111111111111111111111',
      }),
    ).rejects.toThrow(/payload hash mismatch/);
  });

  it('supports custom async signer functions', async () => {
    const mockSigner = async (
      tpl: import('nostr-tools/pure').EventTemplate,
    ) => {
      const { finalizeEvent } = await import('nostr-tools/pure');
      return finalizeEvent(tpl, secretKey);
    };

    const authHeader = await generateNip98AuthHeader(
      {
        url: testUrl,
        method: 'GET',
      },
      mockSigner,
    );

    const validated = await validateNip98Token(authHeader, testUrl, 'GET');
    expect(validated.pubkey).toBe(publicKey);
  });
});

describe('Blossom Authorization (Kind 24242 BUD-11)', () => {
  const secretKey = generateSecretKey();
  const publicKey = getPublicKey(secretKey);
  const testUrl = 'https://media.emre.xyz/upload';
  const testSha256 =
    '80ea288dbde526dd5e27a6e11894d0774641e7cb7609a066b579122049d5a999';

  it('correctly creates an unsigned EventTemplate of Kind 24242 with BUD-11 tags', () => {
    const template = createBlossomAuthEventTemplate({
      type: 'upload',
      url: testUrl,
      sha256: testSha256,
      server: 'media.emre.xyz',
    });

    expect(template.kind).toBe(24242);
    expect(template.tags).toContainEqual(['t', 'upload']);
    expect(template.tags).toContainEqual(['x', testSha256]);
    expect(template.tags).toContainEqual(['server', 'media.emre.xyz']);
    expect(template.tags.some((t) => t[0] === 'expiration')).toBe(true);
    expect(typeof template.created_at).toBe('number');
  });

  it('generates a valid Authorization header with Kind 24242', async () => {
    const authHeader = await generateBlossomAuthHeader(
      {
        type: 'upload',
        url: testUrl,
        sha256: testSha256,
        server: 'media.emre.xyz',
      },
      secretKey,
    );

    expect(authHeader.startsWith('Nostr ')).toBe(true);
    const token = authHeader.replace('Nostr ', '');
    const decodedJson = decodeBase64(token);
    const event = JSON.parse(decodedJson);

    expect(event.pubkey).toBe(publicKey);
    expect(event.kind).toBe(24242);
    expect(event.sig).toBeDefined();
    expect(event.id).toBeDefined();
    expect(event.tags).toContainEqual(['t', 'upload']);
    expect(event.tags).toContainEqual(['x', testSha256]);
  });
});

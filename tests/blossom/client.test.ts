import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateSecretKey } from 'nostr-tools/pure';
import { BlossomClient } from '../../src/lib/blossom/client';

describe('BlossomClient', () => {
  const secretKey = generateSecretKey();
  const serverUrl = 'https://media.emre.xyz';
  let client: BlossomClient;

  beforeEach(() => {
    client = new BlossomClient(serverUrl);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes trailing slashes in serverUrl', () => {
    const customClient = new BlossomClient('https://media.emre.xyz///');
    expect(customClient.serverUrl).toBe('https://media.emre.xyz');
  });

  it('hasBlob returns true when server responds 200', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(null, { status: 200 }),
    );

    const exists = await client.hasBlob('a'.repeat(64));
    expect(exists).toBe(true);
  });

  it('hasBlob returns false when server responds 404', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(null, { status: 404 }),
    );

    const exists = await client.hasBlob('b'.repeat(64));
    expect(exists).toBe(false);
  });

  it('getBlobMetadata parses Content-Length and Content-Type', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(null, {
        status: 200,
        headers: {
          'Content-Length': '2048',
          'Content-Type': 'image/jpeg',
        },
      }),
    );

    const meta = await client.getBlobMetadata('c'.repeat(64));
    expect(meta).not.toBeNull();
    expect(meta?.size).toBe(2048);
    expect(meta?.type).toBe('image/jpeg');
    expect(meta?.url).toBe(`${serverUrl}/${'c'.repeat(64)}`);
  });

  it('uploadBlob sends PUT with NIP-98 header and returns BlobDescriptor', async () => {
    const testData = new Uint8Array([1, 2, 3, 4, 5]);
    const mockResponse = {
      url: `${serverUrl}/test-hash`,
      sha256: 'test-hash',
      size: 5,
      type: 'image/jpeg',
      uploaded: 1234567890,
    };

    let capturedHeaders: Headers | undefined;
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (_url, init) => {
      capturedHeaders = new Headers(init?.headers);
      return new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const progressUpdates: import('../../src/lib/blossom/types').UploadProgress[] =
      [];
    const descriptor = await client.uploadBlob(testData, {
      privateKey: secretKey,
      mimeType: 'image/jpeg',
      onProgress: (p) => progressUpdates.push(p),
    });

    expect(descriptor.url).toBe(mockResponse.url);
    expect(capturedHeaders?.get('Authorization')?.startsWith('Nostr ')).toBe(
      true,
    );
    expect(capturedHeaders?.get('Content-Type')).toBe('image/jpeg');
    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(progressUpdates[progressUpdates.length - 1].percent).toBe(100);
  });

  it('uploadBlob throws when neither privateKey nor signer is provided', async () => {
    const testData = new Uint8Array([1, 2, 3]);
    await expect(client.uploadBlob(testData, {})).rejects.toThrow(
      /Upload authorization requires a privateKey/,
    );
  });

  it('listBlobs fetches list from /list/<pubkey>', async () => {
    const mockList = [
      {
        url: `${serverUrl}/abc`,
        sha256: 'abc',
        size: 1024,
        type: 'image/png',
        uploaded: 1600000000,
      },
    ];

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockList), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const blobs = await client.listBlobs('test-pubkey');
    expect(blobs.length).toBe(1);
    expect(blobs[0].sha256).toBe('abc');
    expect(blobs[0].size).toBe(1024);
  });

  it('deleteBlob sends DELETE with NIP-98 auth', async () => {
    let capturedMethod: string | undefined;
    let capturedAuth: string | null = null;

    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (_url, init) => {
      capturedMethod = init?.method;
      capturedAuth = new Headers(init?.headers).get('Authorization');
      return new Response(null, { status: 200 });
    });

    const success = await client.deleteBlob('test-sha', {
      privateKey: secretKey,
    });

    expect(success).toBe(true);
    expect(capturedMethod).toBe('DELETE');
    expect(capturedAuth).toMatch(/^Nostr /);
  });
});

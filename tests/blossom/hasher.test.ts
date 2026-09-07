import { describe, it, expect } from 'vitest';
import { calculateBlobSha256, bufferToHex } from '../../src/lib/blossom/hasher';

describe('calculateBlobSha256 & bufferToHex', () => {
  it('converts byte buffers to hexadecimal string correctly', () => {
    const bytes = new Uint8Array([0x00, 0x0f, 0xff, 0xaa]);
    expect(bufferToHex(bytes)).toBe('000fffaa');
  });

  it('calculates the correct SHA-256 for an empty buffer', async () => {
    const emptyBuffer = new Uint8Array(0);
    const hash = await calculateBlobSha256(emptyBuffer);
    // Known standard SHA-256 of empty string
    expect(hash).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('calculates the correct SHA-256 for a known string buffer', async () => {
    const encoder = new TextEncoder();
    const data = encoder.encode('hello nostr blossom');
    const hash = await calculateBlobSha256(data);
    expect(hash).toBe(
      '44fb7b05646e77bc7e2705e17b427adfb69b0a91d9d1743cf3fdf8cd8157aaa3',
    );
  });

  it('calculates the correct SHA-256 from a Blob instance', async () => {
    const blob = new Blob(['hello nostr blossom'], { type: 'text/plain' });
    const hash = await calculateBlobSha256(blob);
    expect(hash).toBe(
      '44fb7b05646e77bc7e2705e17b427adfb69b0a91d9d1743cf3fdf8cd8157aaa3',
    );
  });

  it('throws a TypeError if input is not a recognized binary buffer', async () => {
    // @ts-expect-error invalid input
    await expect(calculateBlobSha256(12345)).rejects.toThrow(TypeError);
  });
});

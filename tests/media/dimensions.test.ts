import { describe, it, expect } from 'vitest';
import {
  parseDimensionsFromBuffer,
  extractImageDimensions,
} from '../../src/lib/media/dimensions';

describe('Image Dimension Extraction', () => {
  it('extracts dimensions from a PNG buffer', async () => {
    // Construct a valid minimal PNG header with 800x600 dimensions
    const buffer = new Uint8Array(32);
    // Signature
    buffer.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
    // IHDR length: 13
    buffer.set([0x00, 0x00, 0x00, 0x0d], 8);
    // Chunk type: 'IHDR'
    buffer.set([0x49, 0x48, 0x44, 0x52], 12);
    // Width: 800 (0x00000320)
    buffer.set([0x00, 0x00, 0x03, 0x20], 16);
    // Height: 600 (0x00000258)
    buffer.set([0x00, 0x00, 0x02, 0x58], 20);

    const dims = parseDimensionsFromBuffer(buffer);
    expect(dims).not.toBeNull();
    expect(dims?.width).toBe(800);
    expect(dims?.height).toBe(600);

    const extracted = await extractImageDimensions(buffer);
    expect(extracted.width).toBe(800);
    expect(extracted.height).toBe(600);
    expect(extracted.aspectRatio).toBe(1.3333);
  });

  it('extracts dimensions from a GIF buffer', async () => {
    // Construct valid GIF89a header with 320x240 dimensions
    const buffer = new Uint8Array(16);
    // Signature 'GIF89a'
    buffer.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61], 0);
    // Width: 320 (0x0140 little-endian: 0x40, 0x01)
    buffer[6] = 0x40;
    buffer[7] = 0x01;
    // Height: 240 (0x00F0 little-endian: 0xF0, 0x00)
    buffer[8] = 0xf0;
    buffer[9] = 0x00;

    const dims = parseDimensionsFromBuffer(buffer);
    expect(dims?.width).toBe(320);
    expect(dims?.height).toBe(240);

    const extracted = await extractImageDimensions(buffer);
    expect(extracted.aspectRatio).toBe(1.3333);
  });

  it('extracts dimensions from a JPEG buffer with SOF0 marker', async () => {
    // Construct valid minimal JPEG with 1920x1080 dimensions
    const buffer = new Uint8Array(32);
    // SOI: 0xFF, 0xD8
    buffer[0] = 0xff;
    buffer[1] = 0xd8;
    // SOF0: 0xFF, 0xC0
    buffer[2] = 0xff;
    buffer[3] = 0xc0;
    // Length: 17 (0x00, 0x11)
    buffer[4] = 0x00;
    buffer[5] = 0x11;
    // Precision: 8
    buffer[6] = 0x08;
    // Height: 1080 (0x0438 big-endian)
    buffer[7] = 0x04;
    buffer[8] = 0x38;
    // Width: 1920 (0x0780 big-endian)
    buffer[9] = 0x07;
    buffer[10] = 0x80;

    const dims = parseDimensionsFromBuffer(buffer);
    expect(dims?.width).toBe(1920);
    expect(dims?.height).toBe(1080);

    const extracted = await extractImageDimensions(buffer);
    expect(extracted.width).toBe(1920);
    expect(extracted.height).toBe(1080);
    expect(extracted.aspectRatio).toBe(1.7778);
  });

  it('returns null for unrecognized or too short buffers', () => {
    const emptyBuffer = new Uint8Array(5);
    expect(parseDimensionsFromBuffer(emptyBuffer)).toBeNull();
  });

  it('throws an Error when extractImageDimensions encounters unparsable data in Node', async () => {
    const invalidBuffer = new Uint8Array([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
    ]);
    await expect(extractImageDimensions(invalidBuffer)).rejects.toThrow(
      /Unable to extract dimensions/,
    );
  });
});

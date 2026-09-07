import { describe, it, expect } from 'vitest';
import { parseExifFromBuffer } from '../../src/lib/media/exif';

describe('JPEG EXIF Parser', () => {
  it('returns null on invalid or short buffer', () => {
    expect(parseExifFromBuffer(new Uint8Array([]))).toBeNull();
    expect(parseExifFromBuffer(new Uint8Array([0x00, 0x01, 0x02]))).toBeNull();
    expect(parseExifFromBuffer(new Uint8Array(50).fill(0))).toBeNull();
  });

  it('returns null on JPEG without APP1 EXIF segment', () => {
    // Valid JPEG SOI (FF D8) followed by DQT (FF DB 00 04 ...) and EOI (FF D9)
    const jpeg = new Uint8Array([
      0xff, 0xd8, 0xff, 0xdb, 0x00, 0x04, 0x01, 0x02, 0xff, 0xd9,
    ]);
    expect(parseExifFromBuffer(jpeg)).toBeNull();
  });

  it('parses valid APP1 EXIF segment with little-endian TIFF', () => {
    // Construct a minimal valid JPEG with APP1 and TIFF structure
    // JPEG header: FF D8
    // APP1 marker: FF E1
    // Length: 2 bytes
    // Exif\0\0: 6 bytes
    // TIFF Header:
    //   'II' (0x49, 0x49), 0x2A 0x00 (magic 42), 0x08 0x00 0x00 0x00 (offset to IFD0 = 8)
    // IFD0:
    //   numEntries: 2 (0x02, 0x00)
    //   Entry 1: Make (0x010F), type 2 (ASCII), count 5, offset to string "Sony\0"
    //   Entry 2: Model (0x0110), type 2 (ASCII), count 8, offset to string "ILCE-7M4\0"
    //   nextIFD: 0x00000000

    const tiffHeader = [
      0x49,
      0x49, // II (little endian)
      0x2a,
      0x00, // Magic 42
      0x08,
      0x00,
      0x00,
      0x00, // IFD0 offset = 8
    ];

    const ifd0 = [
      0x02,
      0x00, // 2 entries
      // Entry 1: Tag 0x010F (Make), Type 2 (ASCII), count 5, offset 38 (0x26)
      0x0f,
      0x01,
      0x02,
      0x00,
      0x05,
      0x00,
      0x00,
      0x00,
      0x26,
      0x00,
      0x00,
      0x00,
      // Entry 2: Tag 0x0110 (Model), Type 2 (ASCII), count 9, offset 44 (0x2C)
      0x10,
      0x01,
      0x02,
      0x00,
      0x09,
      0x00,
      0x00,
      0x00,
      0x2c,
      0x00,
      0x00,
      0x00,
      // Next IFD offset
      0x00,
      0x00,
      0x00,
      0x00,
    ];

    // String payloads:
    // at tiff offset 38 (0x26): "Sony\0" (5 bytes)
    const makeStr = [0x53, 0x6f, 0x6e, 0x79, 0x00, 0x00]; // pad to even
    // at tiff offset 44 (0x2C): "ILCE-7M4\0" (9 bytes)
    const modelStr = [
      0x49, 0x4c, 0x43, 0x45, 0x2d, 0x37, 0x4d, 0x34, 0x00, 0x00,
    ];

    const tiffPayload = [...tiffHeader, ...ifd0, ...makeStr, ...modelStr];
    const exifHeader = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]; // Exif\0\0
    const app1Data = [...exifHeader, ...tiffPayload];
    const app1Length = app1Data.length + 2; // includes 2 bytes for length itself

    const jpegBytes = new Uint8Array([
      0xff,
      0xd8, // SOI
      0xff,
      0xe1, // APP1
      (app1Length >> 8) & 0xff,
      app1Length & 0xff,
      ...app1Data,
      0xff,
      0xd9, // EOI
    ]);

    const parsed = parseExifFromBuffer(jpegBytes);
    expect(parsed).not.toBeNull();
    expect(parsed?.make).toBe('Sony');
    expect(parsed?.model).toBe('ILCE-7M4');
  });
});

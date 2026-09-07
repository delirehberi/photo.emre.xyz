/**
 * Image Dimension Extraction Engine
 * photo.emre.xyz
 *
 * Extracts pixel dimensions (width x height) and aspect ratio directly from image binary
 * headers client-side before upload to populate NIP-94 "dim" tags for zero-CLS rendering.
 */

import type { PhotoDimensions } from '../nostr/types';

/**
 * Parses image dimensions from raw bytes of standard image formats (PNG, JPEG, WebP, GIF).
 * Returns null if the format is unrecognized or corrupted.
 */
export function parseDimensionsFromBuffer(
  bytes: Uint8Array,
): { width: number; height: number } | null {
  if (!bytes || bytes.length < 16) {
    return null;
  }

  // 1. PNG check: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    if (bytes.length >= 24) {
      const view = new DataView(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength,
      );
      const width = view.getUint32(16, false); // big-endian
      const height = view.getUint32(20, false);
      if (width > 0 && height > 0) {
        return { width, height };
      }
    }
    return null;
  }

  // 2. GIF check: GIF87a or GIF89a
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    if (bytes.length >= 10) {
      const view = new DataView(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength,
      );
      const width = view.getUint16(6, true); // little-endian
      const height = view.getUint16(8, true);
      if (width > 0 && height > 0) {
        return { width, height };
      }
    }
    return null;
  }

  // 3. WebP check: 'RIFF' .... 'WEBP'
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return parseWebpDimensions(bytes);
  }

  // 4. JPEG check: FF D8
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    return parseJpegDimensions(bytes);
  }

  return null;
}

function parseJpegDimensions(
  bytes: Uint8Array,
): { width: number; height: number } | null {
  let offset = 2;
  const len = bytes.length;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  while (offset < len) {
    if (bytes[offset] !== 0xff) {
      offset++;
      continue;
    }

    const marker = bytes[offset + 1];
    offset += 2;

    // Standalone markers with no payload
    if (
      marker === 0xd8 || // SOI
      marker === 0xd9 || // EOI
      marker === 0x00 || // Stuffed byte
      (marker >= 0xd0 && marker <= 0xd7) // RST
    ) {
      continue;
    }

    if (offset + 2 > len) {
      break;
    }

    const segmentLength = view.getUint16(offset, false);
    if (segmentLength < 2) {
      break;
    }

    // SOF markers: SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    if (isSof && offset + 7 <= len) {
      // Precision is at offset + 2 (1 byte)
      const height = view.getUint16(offset + 3, false);
      const width = view.getUint16(offset + 5, false);
      if (width > 0 && height > 0) {
        return { width, height };
      }
    }

    offset += segmentLength;
  }

  return null;
}

function parseWebpDimensions(
  bytes: Uint8Array,
): { width: number; height: number } | null {
  if (bytes.length < 30) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // VP8 (lossy)
  if (
    bytes[12] === 0x56 &&
    bytes[13] === 0x50 &&
    bytes[14] === 0x38 &&
    bytes[15] === 0x20
  ) {
    if (bytes.length >= 30) {
      // Check 3-byte start code 0x9D 0x01 0x2A
      if (bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
        const width = view.getUint16(26, true) & 0x3fff;
        const height = view.getUint16(28, true) & 0x3fff;
        if (width > 0 && height > 0) return { width, height };
      }
    }
  }

  // VP8L (lossless)
  if (
    bytes[12] === 0x56 &&
    bytes[13] === 0x50 &&
    bytes[14] === 0x38 &&
    bytes[15] === 0x4c
  ) {
    if (bytes.length >= 25 && bytes[20] === 0x2f) {
      const b1 = bytes[21];
      const b2 = bytes[22];
      const b3 = bytes[23];
      const b4 = bytes[24];

      const width = 1 + (((b2 & 0x3f) << 8) | b1);
      const height = 1 + (((b4 & 0xf) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
      if (width > 0 && height > 0) return { width, height };
    }
  }

  // VP8X (extended)
  if (
    bytes[12] === 0x56 &&
    bytes[13] === 0x50 &&
    bytes[14] === 0x38 &&
    bytes[15] === 0x58
  ) {
    if (bytes.length >= 30) {
      // Canvas width (24-bit little endian) at bytes 24..26
      const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
      // Canvas height (24-bit little endian) at bytes 27..29
      const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
      if (width > 0 && height > 0) return { width, height };
    }
  }

  return null;
}

/**
 * Extracts image dimensions client-side prior to upload.
 * Uses fast binary header decoding, falling back to browser image decoding if needed.
 *
 * @param fileOrBuffer Image Blob, File, ArrayBuffer, or Uint8Array
 * @returns Typed PhotoDimensions ({ width, height, aspectRatio })
 */
export async function extractImageDimensions(
  fileOrBuffer: Blob | File | ArrayBuffer | Uint8Array,
): Promise<PhotoDimensions> {
  let bytes: Uint8Array;

  if (typeof Blob !== 'undefined' && fileOrBuffer instanceof Blob) {
    // Read first 64KB for header decoding
    const headerSlice = fileOrBuffer.slice(0, 65536);
    const buffer = await headerSlice.arrayBuffer();
    bytes = new Uint8Array(buffer);
  } else if (fileOrBuffer instanceof Uint8Array) {
    bytes = fileOrBuffer;
  } else if (fileOrBuffer instanceof ArrayBuffer) {
    bytes = new Uint8Array(fileOrBuffer);
  } else {
    throw new TypeError(
      'Invalid input type: expected Blob, File, ArrayBuffer, or Uint8Array.',
    );
  }

  // Attempt fast binary header decoding
  const parsed = parseDimensionsFromBuffer(bytes);
  if (parsed && parsed.width > 0 && parsed.height > 0) {
    const aspectRatio = Number((parsed.width / parsed.height).toFixed(4));
    return {
      width: parsed.width,
      height: parsed.height,
      aspectRatio,
    };
  }

  // Browser Image decoding fallback
  if (
    typeof window !== 'undefined' &&
    typeof Blob !== 'undefined' &&
    fileOrBuffer instanceof Blob
  ) {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(fileOrBuffer);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        if (width > 0 && height > 0) {
          resolve({
            width,
            height,
            aspectRatio: Number((width / height).toFixed(4)),
          });
        } else {
          reject(new Error('Failed to determine image natural dimensions'));
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(
          new Error('Browser failed to decode image for dimension extraction'),
        );
      };

      img.src = objectUrl;
    });
  }

  throw new Error(
    'Unable to extract dimensions from image header or decode binary stream',
  );
}

/**
 * JPEG Binary EXIF Metadata Extractor
 * photo.emre.xyz
 *
 * Lightweight, zero-dependency binary parser that extracts photographic technical metadata
 * (Camera Make, Model, Lens, ISO, F-stop, Shutter Speed, Focal Length) from JPEG APP1 headers.
 */

import type { PhotoExif } from '../nostr/types';

/**
 * Parses EXIF technical metadata from raw JPEG binary data.
 * Returns null if the buffer is not a valid JPEG or contains no APP1 EXIF segment.
 */
export function parseExifFromBuffer(bytes: Uint8Array): PhotoExif | null {
  if (!bytes || bytes.length < 32) {
    return null;
  }

  // Verify JPEG SOI marker (0xFF 0xD8)
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  const len = bytes.length;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  let exifBlockOffset = -1;
  let exifBlockLength = 0;

  // Scan JPEG segments for APP1 (0xFF 0xE1) with 'Exif\0\0' header
  while (offset + 4 <= len) {
    if (bytes[offset] !== 0xff) {
      offset++;
      continue;
    }

    const marker = bytes[offset + 1];
    offset += 2;

    // Skip standalone markers without payloads
    if (
      marker === 0xd8 ||
      marker === 0xd9 ||
      marker === 0x00 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      continue;
    }

    if (offset + 2 > len) break;
    const segmentLength = view.getUint16(offset, false);
    if (segmentLength < 2 || offset + segmentLength > len) break;

    // APP1 marker
    if (marker === 0xe1 && segmentLength >= 8) {
      // Check for 'Exif\0\0' header (0x45, 0x78, 0x69, 0x66, 0x00, 0x00)
      if (
        bytes[offset + 2] === 0x45 &&
        bytes[offset + 3] === 0x78 &&
        bytes[offset + 4] === 0x69 &&
        bytes[offset + 5] === 0x66 &&
        bytes[offset + 6] === 0x00 &&
        bytes[offset + 7] === 0x00
      ) {
        exifBlockOffset = offset + 8;
        exifBlockLength = segmentLength - 8;
        break;
      }
    }

    // Stop scanning once Start of Scan (SOS 0xDA) is reached
    if (marker === 0xda) break;

    offset += segmentLength;
  }

  if (exifBlockOffset === -1 || exifBlockLength < 14) {
    return null;
  }

  return parseTiffHeader(bytes, exifBlockOffset, exifBlockLength);
}

/**
 * Parses the TIFF structure inside the APP1 segment.
 */
function parseTiffHeader(
  bytes: Uint8Array,
  tiffOffset: number,
  tiffLength: number,
): PhotoExif | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // Check endianness: 'II' (0x4949) little-endian, 'MM' (0x4D4D) big-endian
  const byteOrder1 = bytes[tiffOffset];
  const byteOrder2 = bytes[tiffOffset + 1];

  let littleEndian: boolean;
  if (byteOrder1 === 0x49 && byteOrder2 === 0x49) {
    littleEndian = true;
  } else if (byteOrder1 === 0x4d && byteOrder2 === 0x4d) {
    littleEndian = false;
  } else {
    return null;
  }

  // TIFF magic 42 (0x002A)
  const magic = view.getUint16(tiffOffset + 2, littleEndian);
  if (magic !== 0x002a) {
    return null;
  }

  // Offset to IFD0
  const firstIfdOffset = view.getUint32(tiffOffset + 4, littleEndian);
  if (firstIfdOffset < 8 || firstIfdOffset >= tiffLength) {
    return null;
  }

  const result: PhotoExif = {};

  // Parse IFD0
  const exifSubIfdOffset = parseIfdEntries(
    view,
    bytes,
    tiffOffset,
    tiffOffset + firstIfdOffset,
    tiffLength,
    littleEndian,
    result,
  );

  // Parse Exif Sub-IFD if present
  if (
    exifSubIfdOffset &&
    exifSubIfdOffset > 0 &&
    exifSubIfdOffset < tiffLength
  ) {
    parseIfdEntries(
      view,
      bytes,
      tiffOffset,
      tiffOffset + exifSubIfdOffset,
      tiffLength,
      littleEndian,
      result,
    );
  }

  // If completely empty, return null
  if (Object.keys(result).length === 0) {
    return null;
  }

  return result;
}

/**
 * Reads IFD entries and populates the PhotoExif object.
 * Returns the offset to the Exif Sub-IFD if found.
 */
function parseIfdEntries(
  view: DataView,
  bytes: Uint8Array,
  tiffStart: number,
  ifdStart: number,
  tiffLength: number,
  littleEndian: boolean,
  out: PhotoExif,
): number | null {
  if (ifdStart + 2 > tiffStart + tiffLength) {
    return null;
  }

  const entryCount = view.getUint16(ifdStart, littleEndian);
  let currentOffset = ifdStart + 2;
  let exifSubIfdOffset: number | null = null;

  for (let i = 0; i < entryCount; i++) {
    if (currentOffset + 12 > tiffStart + tiffLength) break;

    const tag = view.getUint16(currentOffset, littleEndian);
    const type = view.getUint16(currentOffset + 2, littleEndian);
    const count = view.getUint32(currentOffset + 4, littleEndian);
    const valueOrOffset = currentOffset + 8;

    switch (tag) {
      case 0x010f: // Make
        if (type === 2) {
          const make = readAsciiString(
            view,
            bytes,
            tiffStart,
            valueOrOffset,
            count,
            littleEndian,
          );
          if (make) out.make = make;
        }
        break;

      case 0x0110: // Model
        if (type === 2) {
          const model = readAsciiString(
            view,
            bytes,
            tiffStart,
            valueOrOffset,
            count,
            littleEndian,
          );
          if (model) out.model = model;
        }
        break;

      case 0x8769: // Exif Sub-IFD pointer
        if (type === 4) {
          exifSubIfdOffset = view.getUint32(valueOrOffset, littleEndian);
        }
        break;

      case 0x829a: // ExposureTime (Shutter speed)
        if (type === 5) {
          const rational = readRational(
            view,
            tiffStart,
            valueOrOffset,
            littleEndian,
          );
          if (rational) {
            const { num, den } = rational;
            if (num > 0 && den > 0) {
              if (num === 1) {
                out.shutterSpeed = `1/${den}s`;
              } else if (num < den) {
                out.shutterSpeed = `1/${Math.round(den / num)}s`;
              } else {
                out.shutterSpeed = `${(num / den).toFixed(1)}s`;
              }
            }
          }
        }
        break;

      case 0x829d: // FNumber (Aperture)
        if (type === 5) {
          const rational = readRational(
            view,
            tiffStart,
            valueOrOffset,
            littleEndian,
          );
          if (rational && rational.den > 0) {
            const fVal = rational.num / rational.den;
            out.aperture = `f/${fVal % 1 === 0 ? fVal.toFixed(0) : fVal.toFixed(1)}`;
          }
        }
        break;

      case 0x8827: // ISOSpeedRatings
      case 0x8833: // PhotographicSensitivity
        if (type === 3) {
          out.iso = view.getUint16(valueOrOffset, littleEndian);
        } else if (type === 4) {
          out.iso = view.getUint32(valueOrOffset, littleEndian);
        }
        break;

      case 0x9003: // DateTimeOriginal
        if (type === 2) {
          const dt = readAsciiString(
            view,
            bytes,
            tiffStart,
            valueOrOffset,
            count,
            littleEndian,
          );
          if (dt) out.dateTimeOriginal = dt;
        }
        break;

      case 0x920a: // FocalLength
        if (type === 5) {
          const rational = readRational(
            view,
            tiffStart,
            valueOrOffset,
            littleEndian,
          );
          if (rational && rational.den > 0) {
            const fl = rational.num / rational.den;
            out.focalLength = `${Math.round(fl)}mm`;
          }
        }
        break;

      case 0xa434: // LensModel
        if (type === 2) {
          const lens = readAsciiString(
            view,
            bytes,
            tiffStart,
            valueOrOffset,
            count,
            littleEndian,
          );
          if (lens) out.lens = lens;
        }
        break;
    }

    currentOffset += 12;
  }

  return exifSubIfdOffset;
}

function readRational(
  view: DataView,
  tiffStart: number,
  valueOrOffset: number,
  littleEndian: boolean,
): { num: number; den: number } | null {
  const offset = view.getUint32(valueOrOffset, littleEndian);
  const target = tiffStart + offset;
  if (target + 8 > view.byteLength) return null;

  const num = view.getUint32(target, littleEndian);
  const den = view.getUint32(target + 4, littleEndian);
  return { num, den };
}

function readAsciiString(
  view: DataView,
  bytes: Uint8Array,
  tiffStart: number,
  valueOrOffset: number,
  count: number,
  littleEndian: boolean,
): string | null {
  if (count <= 0) return null;

  let stringOffset = valueOrOffset;
  if (count > 4) {
    const relOffset = view.getUint32(valueOrOffset, littleEndian);
    stringOffset = tiffStart + relOffset;
  }

  if (stringOffset + count > bytes.length) {
    return null;
  }

  const strBytes = bytes.subarray(stringOffset, stringOffset + count);
  let str = '';
  for (let i = 0; i < strBytes.length; i++) {
    if (strBytes[i] === 0) break; // null terminator
    str += String.fromCharCode(strBytes[i]);
  }

  const trimmed = str.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Extracts EXIF technical metadata from a File, Blob, ArrayBuffer, or Uint8Array.
 */
export async function extractExifFromBlob(
  fileOrBuffer: Blob | File | ArrayBuffer | Uint8Array,
): Promise<PhotoExif | null> {
  let bytes: Uint8Array;

  if (typeof Blob !== 'undefined' && fileOrBuffer instanceof Blob) {
    // Read first 128KB which reliably contains all EXIF headers
    const slice = fileOrBuffer.slice(0, 131072);
    const buffer = await slice.arrayBuffer();
    bytes = new Uint8Array(buffer);
  } else if (fileOrBuffer instanceof Uint8Array) {
    bytes = fileOrBuffer;
  } else if (fileOrBuffer instanceof ArrayBuffer) {
    bytes = new Uint8Array(fileOrBuffer);
  } else {
    return null;
  }

  try {
    return parseExifFromBuffer(bytes);
  } catch {
    return null;
  }
}

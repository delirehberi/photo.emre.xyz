/**
 * Cryptographic Checksum Engine
 * photo.emre.xyz
 */

/**
 * Converts an ArrayBuffer or Uint8Array into a lowercase hexadecimal string.
 */
export function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const byteArray =
    buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(byteArray, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

/**
 * Calculates the raw SHA-256 digest of binary data using Web Crypto API.
 * Compatible with Browser, Cloudflare Workers, and Node.js runtimes.
 *
 * @param data Blob, File, ArrayBuffer, or Uint8Array to hash
 * @returns 64-character lowercase hexadecimal SHA-256 hash
 */
export async function calculateBlobSha256(
  data: Blob | ArrayBuffer | Uint8Array,
): Promise<string> {
  let arrayBuffer: ArrayBuffer;

  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    arrayBuffer = await data.arrayBuffer();
  } else if (data instanceof Uint8Array) {
    // Slice ensures we have an exact ArrayBuffer view of byteOffset and byteLength
    arrayBuffer = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength,
    ) as ArrayBuffer;
  } else if (data instanceof ArrayBuffer) {
    arrayBuffer = data;
  } else {
    throw new TypeError(
      'Invalid data type for SHA-256 calculation. Expected Blob, ArrayBuffer, or Uint8Array.',
    );
  }

  const subtleCrypto = globalThis.crypto?.subtle;
  if (!subtleCrypto) {
    throw new Error(
      'Web Crypto API (crypto.subtle) is not available in the current environment.',
    );
  }

  const hashBuffer = await subtleCrypto.digest('SHA-256', arrayBuffer);
  return bufferToHex(hashBuffer);
}

/**
 * Unlisted Album Resolution & NIP-44 Client-Side Encryption
 * photo.emre.xyz
 */

import { nip44 } from 'nostr-tools';

/**
 * Generates a cryptographically secure, high-entropy d-tag for unlisted Event Albums.
 * Security through unindexability / obscurity prevents album discovery through public directory feeds.
 *
 * @param byteLength Number of random bytes (default 16 bytes = 128 bits of entropy)
 * @returns A base64url-encoded random string
 */
export function generateUnlistedDTag(byteLength = 16): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Evaluates whether a given d-tag possesses sufficient cryptographic entropy
 * to be considered an unlisted/unindexable album identifier.
 */
export function isHighEntropyDTag(dTag: string): boolean {
  if (typeof dTag !== 'string') return false;
  const trimmed = dTag.trim();
  // Must be at least 32 hex characters (128-bit)
  if (/^[a-f0-9]{32,}$/i.test(trimmed)) return true;
  // Or at least 22 characters of base64url
  if (/^[A-Za-z0-9_-]{22,}$/.test(trimmed)) return true;
  return false;
}

/**
 * Converts a hex string into a Uint8Array byte buffer.
 */
function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase();
  if (clean.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Derives a NIP-44 v2 conversation key from a private key and a peer public key.
 */
export function getConversationKey(
  privateKey: Uint8Array | string,
  peerPublicKey: string,
): Uint8Array {
  const keyBytes =
    typeof privateKey === 'string' ? hexToBytes(privateKey) : privateKey;
  return nip44.v2.utils.getConversationKey(keyBytes, peerPublicKey);
}

/**
 * Encrypts an arbitrary payload (object, string, or array) using NIP-44 v2 authenticated encryption.
 */
export function encryptPayload(
  payload: unknown,
  conversationKey: Uint8Array,
): string {
  const serialized =
    typeof payload === 'string' ? payload : JSON.stringify(payload);
  return nip44.v2.encrypt(serialized, conversationKey);
}

/**
 * Decrypts a NIP-44 v2 ciphertext and parses JSON if the payload was serialized as an object.
 */
export function decryptPayload<T = unknown>(
  ciphertext: string,
  conversationKey: Uint8Array,
): T {
  const decryptedText = nip44.v2.decrypt(ciphertext, conversationKey);
  try {
    return JSON.parse(decryptedText) as T;
  } catch {
    return decryptedText as unknown as T;
  }
}

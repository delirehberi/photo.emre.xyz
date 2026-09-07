/**
 * Nostr Cryptographic Key Utilities
 * photo.emre.xyz
 */

import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { bytesToHex, hexToBytes, isHex32 } from 'nostr-tools/utils';
import * as nip19 from 'nostr-tools/nip19';

export interface NostrKeypair {
  /** Raw 32-byte secret key */
  secretKey: Uint8Array;
  /** Hex-encoded 64-character secret key */
  hexSecretKey: string;
  /** Bech32-encoded nsec private key */
  nsec: string;
  /** Hex-encoded 64-character public key */
  pubkey: string;
  /** Bech32-encoded npub public key */
  npub: string;
}

export type KeyInputType = 'nsec' | 'npub' | 'hex-sec' | 'hex-pub' | 'unknown';

export interface ParsedKeyInput {
  type: KeyInputType;
  /** Normalized 64-character hex string (pubkey or secret key) */
  hex: string | null;
  /** Bech32 encoded string if applicable */
  bech32: string | null;
  /** Raw 32-byte secret key if input was a private key */
  secretKey: Uint8Array | null;
  isValid: boolean;
}

/**
 * Generates a brand new, cryptographically secure Nostr keypair in-memory.
 */
export function generateNostrKeypair(): NostrKeypair {
  const secretKey = generateSecretKey();
  const hexSecretKey = bytesToHex(secretKey);
  const nsec = nip19.nsecEncode(secretKey);
  const pubkey = getPublicKey(secretKey);
  const npub = nip19.npubEncode(pubkey);

  return {
    secretKey,
    hexSecretKey,
    nsec,
    pubkey,
    npub,
  };
}

/**
 * Validates whether a string is a valid Bech32-encoded npub.
 */
export function validateNpub(npub: string): boolean {
  if (typeof npub !== 'string' || !npub.startsWith('npub1')) {
    return false;
  }
  try {
    const decoded = nip19.decode(npub.trim());
    return decoded.type === 'npub' && isHex32(decoded.data);
  } catch {
    return false;
  }
}

/**
 * Validates whether a string is a valid Bech32-encoded nsec.
 */
export function validateNsec(nsec: string): boolean {
  if (typeof nsec !== 'string' || !nsec.startsWith('nsec1')) {
    return false;
  }
  try {
    const decoded = nip19.decode(nsec.trim());
    return (
      decoded.type === 'nsec' &&
      decoded.data instanceof Uint8Array &&
      decoded.data.length === 32
    );
  } catch {
    return false;
  }
}

/**
 * Validates whether a string is a valid 64-character hex key (pubkey or sec).
 */
export function validateHexKey(key: string): boolean {
  if (typeof key !== 'string') return false;
  return isHex32(key.trim().toLowerCase());
}

/**
 * Converts a Bech32 nsec into raw 32-byte Uint8Array secret key.
 * Throws if the input is not a valid nsec.
 */
export function nsecToSecretKey(nsec: string): Uint8Array {
  const decoded = nip19.decode(nsec.trim());
  if (
    decoded.type !== 'nsec' ||
    !(decoded.data instanceof Uint8Array) ||
    decoded.data.length !== 32
  ) {
    throw new Error('Invalid Bech32 nsec string');
  }
  return decoded.data;
}

/**
 * Converts raw 32-byte Uint8Array secret key to Bech32 nsec.
 */
export function secretKeyToNsec(secretKey: Uint8Array): string {
  if (!(secretKey instanceof Uint8Array) || secretKey.length !== 32) {
    throw new Error('Secret key must be a 32-byte Uint8Array');
  }
  return nip19.nsecEncode(secretKey);
}

/**
 * Converts a Bech32 npub into a 64-character hex public key.
 * Throws if the input is not a valid npub.
 */
export function npubToHex(npub: string): string {
  const decoded = nip19.decode(npub.trim());
  if (decoded.type !== 'npub' || !isHex32(decoded.data)) {
    throw new Error('Invalid Bech32 npub string');
  }
  return decoded.data.toLowerCase();
}

/**
 * Converts a 64-character hex public key into a Bech32 npub.
 */
export function pubkeyToNpub(hexPubkey: string): string {
  const clean = hexPubkey.trim().toLowerCase();
  if (!isHex32(clean)) {
    throw new Error('Invalid hex public key: must be 64-character hex string');
  }
  return nip19.npubEncode(clean);
}

/**
 * Converts raw 32-byte secret key to 64-character hex string.
 */
export function secretKeyToHex(secretKey: Uint8Array): string {
  if (!(secretKey instanceof Uint8Array) || secretKey.length !== 32) {
    throw new Error('Secret key must be a 32-byte Uint8Array');
  }
  return bytesToHex(secretKey);
}

/**
 * Converts a 64-character hex secret key to 32-byte Uint8Array.
 */
export function hexToSecretKey(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase();
  if (!isHex32(clean)) {
    throw new Error('Invalid hex secret key: must be 64-character hex string');
  }
  return hexToBytes(clean);
}

/**
 * Parses and categorizes any Nostr key input (npub, nsec, hex pubkey, or hex sec).
 */
export function parseKeyInput(rawInput: string): ParsedKeyInput {
  if (typeof rawInput !== 'string') {
    return {
      type: 'unknown',
      hex: null,
      bech32: null,
      secretKey: null,
      isValid: false,
    };
  }

  const input = rawInput.trim();

  // 1. Check Bech32 nsec
  if (input.startsWith('nsec1')) {
    try {
      const decoded = nip19.decode(input);
      if (
        decoded.type === 'nsec' &&
        decoded.data instanceof Uint8Array &&
        decoded.data.length === 32
      ) {
        return {
          type: 'nsec',
          hex: bytesToHex(decoded.data),
          bech32: input,
          secretKey: decoded.data,
          isValid: true,
        };
      }
    } catch {
      // Fall through to unknown
    }
  }

  // 2. Check Bech32 npub
  if (input.startsWith('npub1')) {
    try {
      const decoded = nip19.decode(input);
      if (decoded.type === 'npub' && isHex32(decoded.data)) {
        return {
          type: 'npub',
          hex: decoded.data.toLowerCase(),
          bech32: input,
          secretKey: null,
          isValid: true,
        };
      }
    } catch {
      // Fall through to unknown
    }
  }

  // 3. Check 64-character hex
  if (isHex32(input.toLowerCase())) {
    const hex = input.toLowerCase();
    return {
      type: 'hex-pub',
      hex,
      bech32: nip19.npubEncode(hex),
      secretKey: null,
      isValid: true,
    };
  }

  return {
    type: 'unknown',
    hex: null,
    bech32: null,
    secretKey: null,
    isValid: false,
  };
}

/**
 * Creates a downloadable JSON backup document containing key metadata and security advice.
 */
export function createKeyBackupJson(keypair: {
  pubkey: string;
  npub: string;
  nsec: string;
  name?: string;
}): string {
  const backup = {
    notice:
      'DO NOT SHARE YOUR NSEC. Anyone with your nsec has full control over your Nostr identity and media.',
    createdAt: new Date().toISOString(),
    name: keypair.name || 'photo.emre.xyz Identity',
    publicKey: {
      hex: keypair.pubkey,
      npub: keypair.npub,
    },
    privateKey: {
      nsec: keypair.nsec,
    },
    relays: [
      'wss://relay.emre.xyz',
      'wss://relay.damus.io',
      'wss://relay.primal.net',
      'wss://nos.lol',
    ],
  };

  return JSON.stringify(backup, null, 2);
}

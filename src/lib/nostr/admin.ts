/**
 * Admin Authorization & Cryptographic Challenge-Response Verification
 * photo.emre.xyz
 */

import { verifyEvent } from 'nostr-tools/pure';
import { bytesToHex } from 'nostr-tools/utils';
import {
  ADMIN_PUBKEY,
  ADMIN_CHALLENGE_TIMEOUT_SECONDS,
  NOSTR_KINDS,
} from './config';
import { sanitizePubkey } from './sanitizer';
import type { EventTemplate, NostrEvent } from './types';

export interface AdminChallenge {
  challenge: string;
  timestamp: number;
  expiresAt: number;
}

export interface ChallengeVerificationResult {
  valid: boolean;
  error?: string;
  pubkey?: string;
}

/**
 * Checks whether a given public key matches the configured administrator public key.
 */
export function isAdmin(
  pubkey: string | null | undefined,
  configuredAdminPubkey: string = ADMIN_PUBKEY,
): boolean {
  if (!pubkey) return false;
  const clean = sanitizePubkey(pubkey);
  const target = sanitizePubkey(configuredAdminPubkey);
  if (!clean || !target) return false;
  return clean === target;
}

/**
 * Creates a cryptographically random, timestamped challenge nonce for admin authentication.
 */
export function createAdminChallenge(
  prefix = 'photo-admin-challenge',
  validitySeconds = ADMIN_CHALLENGE_TIMEOUT_SECONDS,
): AdminChallenge {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonceBytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(nonceBytes);
  } else {
    for (let i = 0; i < 16; i++) {
      nonceBytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const nonce = bytesToHex(nonceBytes);
  const challenge = `${prefix}:${timestamp}:${nonce}`;
  const expiresAt = timestamp + validitySeconds;

  return {
    challenge,
    timestamp,
    expiresAt,
  };
}

/**
 * Generates an unsigned EventTemplate for an admin challenge response.
 * Uses NIP-98 HTTP Auth Kind 27235 for standards compatibility.
 */
export function createAdminChallengeTemplate(
  challenge: string,
  url = 'https://photo.emre.xyz/api/admin/verify',
): EventTemplate {
  return {
    kind: NOSTR_KINDS.BLOSSOM_AUTH,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['u', url],
      ['method', 'POST'],
      ['challenge', challenge],
    ],
    content: 'Authorize photo.emre.xyz Admin Access',
  };
}

/**
 * Cryptographically verifies an admin challenge-response signature.
 * Enforces:
 * 1. Valid event structure and cryptographic Schnorr signature
 * 2. Event pubkey matches configured admin pubkey
 * 3. Timestamp within acceptable clock drift window (prevents replay attacks)
 * 4. Challenge tag strictly matches the expected challenge nonce
 */
export function verifyAdminChallenge(
  event: NostrEvent,
  expectedChallenge: string,
  allowedAdminPubkey: string = ADMIN_PUBKEY,
  maxAgeSeconds = ADMIN_CHALLENGE_TIMEOUT_SECONDS,
): ChallengeVerificationResult {
  if (!event || typeof event !== 'object') {
    return { valid: false, error: 'Malformed or missing Nostr event payload' };
  }

  // 1. Verify cryptographic signature on clean event (preventing in-memory verifiedSymbol spoofing)
  const cleanEvent: NostrEvent = {
    id: event.id,
    pubkey: event.pubkey,
    created_at: event.created_at,
    kind: event.kind,
    tags: event.tags,
    content: event.content,
    sig: event.sig,
  };

  try {
    const isSignatureValid = verifyEvent(cleanEvent);
    if (!isSignatureValid) {
      return {
        valid: false,
        error: 'Invalid cryptographic signature on challenge event',
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { valid: false, error: `Signature verification failed: ${msg}` };
  }

  // 2. Verify admin identity match
  if (!isAdmin(event.pubkey, allowedAdminPubkey)) {
    return {
      valid: false,
      error: `Unauthorized pubkey: ${event.pubkey} is not the configured administrator`,
      pubkey: event.pubkey,
    };
  }

  // 3. Prevent replay attacks via clock drift check
  const nowSeconds = Math.floor(Date.now() / 1000);
  const timeDifference = Math.abs(nowSeconds - event.created_at);
  if (timeDifference > maxAgeSeconds) {
    return {
      valid: false,
      error: `Challenge event timestamp expired or out of allowed window (+/- ${maxAgeSeconds}s)`,
      pubkey: event.pubkey,
    };
  }

  // 4. Validate challenge tag
  const challengeTag = event.tags?.find(
    (t) => Array.isArray(t) && t[0] === 'challenge',
  );
  if (!challengeTag || challengeTag[1] !== expectedChallenge) {
    return {
      valid: false,
      error:
        'Challenge mismatch: event does not contain the expected challenge nonce',
      pubkey: event.pubkey,
    };
  }

  return {
    valid: true,
    pubkey: event.pubkey,
  };
}

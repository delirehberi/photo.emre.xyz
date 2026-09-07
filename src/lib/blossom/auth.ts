/**
 * NIP-98 HTTP Authorization (Kind 27235) for Blossom
 * photo.emre.xyz
 */

import { finalizeEvent, verifyEvent } from 'nostr-tools/pure';
import { NOSTR_KINDS } from '../nostr/config';
import { sanitizeSha256, sanitizeUrl } from '../nostr/sanitizer';
import { NIP98_VALIDITY_WINDOW_SECONDS } from './config';
import type {
  EventTemplate,
  Nip98AuthParams,
  BlossomAuthParams,
  NostrEvent,
  SignerFunction,
} from './types';

/**
 * Encodes a UTF-8 string into standard Base64 across all JavaScript runtimes.
 */
export function encodeBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decodes a Base64 string into a UTF-8 string across all JavaScript runtimes.
 */
export function decodeBase64(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Constructs an unsigned EventTemplate for a Blossom BUD-11 Authorization event (Kind 24242).
 */
export function createBlossomAuthEventTemplate(
  params: BlossomAuthParams,
): EventTemplate {
  const verb = params.type.trim().toLowerCase();
  const validitySeconds = params.validitySeconds ?? 300;
  const now = Math.floor(Date.now() / 1000);
  const expiration = String(now + validitySeconds);

  const tags: string[][] = [
    ['t', verb],
    ['expiration', expiration],
  ];

  if (params.sha256) {
    const sha256 = sanitizeSha256(params.sha256);
    if (sha256) {
      tags.push(['x', sha256]);
    }
  }

  if (params.server) {
    tags.push(['server', params.server.toLowerCase()]);
  } else if (params.url) {
    try {
      const parsedUrl = new URL(params.url);
      tags.push(['server', parsedUrl.hostname.toLowerCase()]);
    } catch {
      // Ignore URL parse error
    }
  }

  if (params.url) {
    const sanitizedUrl = sanitizeUrl(params.url);
    if (sanitizedUrl) {
      tags.push(['u', sanitizedUrl]);
    }
  }

  const defaultContent =
    verb === 'upload'
      ? 'Upload blob'
      : verb === 'delete'
        ? 'Delete blob'
        : verb === 'list'
          ? 'List blobs'
          : `${verb} blob`;

  return {
    kind: NOSTR_KINDS.BLOSSOM_AUTH,
    created_at: now,
    tags,
    content: params.content?.trim() || defaultContent,
  };
}

/**
 * Generates an HTTP `Authorization: Nostr <base64>` header token for Blossom requests (Kind 24242).
 */
export async function generateBlossomAuthHeader(
  params: BlossomAuthParams,
  signer: SignerFunction | Uint8Array,
): Promise<string> {
  const template = createBlossomAuthEventTemplate(params);

  let signedEvent: NostrEvent;
  if (signer instanceof Uint8Array) {
    signedEvent = finalizeEvent(template, signer);
  } else if (typeof signer === 'function') {
    signedEvent = await signer(template);
  } else {
    throw new TypeError(
      'Invalid signer: expected Uint8Array private key or SignerFunction.',
    );
  }

  if (!signedEvent.id || !signedEvent.sig || !signedEvent.pubkey) {
    throw new Error('Signer returned an incomplete or unsigned Nostr event');
  }

  const serialized = JSON.stringify(signedEvent);
  const base64 = encodeBase64(serialized);

  return `Nostr ${base64}`;
}

/**
 * Constructs an unsigned EventTemplate for a NIP-98 HTTP Auth event (Kind 27235).
 */
export function createNip98EventTemplate(
  params: Nip98AuthParams,
): EventTemplate {
  const url = sanitizeUrl(params.url);
  if (!url) {
    throw new Error('Valid URL is required for NIP-98 authorization');
  }

  const method = params.method.trim().toUpperCase();
  if (!method) {
    throw new Error('HTTP method is required for NIP-98 authorization');
  }

  const tags: string[][] = [
    ['u', url],
    ['method', method],
  ];

  if (params.sha256) {
    const sha256 = sanitizeSha256(params.sha256);
    if (!sha256) {
      throw new Error('Invalid SHA-256 hash provided for NIP-98 authorization');
    }
    tags.push(['x', sha256]);
  }

  return {
    kind: NOSTR_KINDS.NIP98_AUTH,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: params.content?.trim() || '',
  };
}

/**
 * Generates an HTTP `Authorization: Nostr <base64>` header token for generic NIP-98 requests (Kind 27235).
 * Accepts either a raw private key (Uint8Array) or an asynchronous signer function (e.g. NIP-07 / NIP-46).
 */
export async function generateNip98AuthHeader(
  params: Nip98AuthParams,
  signer: SignerFunction | Uint8Array,
): Promise<string> {
  const template = createNip98EventTemplate(params);

  let signedEvent: NostrEvent;
  if (signer instanceof Uint8Array) {
    signedEvent = finalizeEvent(template, signer);
  } else if (typeof signer === 'function') {
    signedEvent = await signer(template);
  } else {
    throw new TypeError(
      'Invalid signer: expected Uint8Array private key or SignerFunction.',
    );
  }

  if (!signedEvent.id || !signedEvent.sig || !signedEvent.pubkey) {
    throw new Error('Signer returned an incomplete or unsigned Nostr event');
  }

  const serialized = JSON.stringify(signedEvent);
  const base64 = encodeBase64(serialized);

  return `Nostr ${base64}`;
}

/**
 * Parses and validates an incoming NIP-98 HTTP authorization header.
 * Verifies timestamp freshness, URL matching, method matching, and cryptographic signature.
 */
export async function validateNip98Token(
  authHeader: string,
  expectedUrl: string,
  expectedMethod: string,
  options: { maxAgeSeconds?: number; expectedSha256?: string } = {},
): Promise<NostrEvent> {
  if (!authHeader || typeof authHeader !== 'string') {
    throw new Error('Missing or invalid Authorization header');
  }

  const parts = authHeader.trim().split(' ');
  const token =
    parts.length === 2 && parts[0].toLowerCase() === 'nostr'
      ? parts[1]
      : parts[0];

  let rawJson: string;
  try {
    rawJson = decodeBase64(token);
  } catch {
    throw new Error('Invalid Base64 encoding in Authorization header');
  }

  let event: NostrEvent;
  try {
    event = JSON.parse(rawJson);
  } catch {
    throw new Error('Malformed JSON in NIP-98 authorization payload');
  }

  if (event.kind !== NOSTR_KINDS.NIP98_AUTH) {
    throw new Error(
      `Invalid event kind: expected ${NOSTR_KINDS.NIP98_AUTH}, received ${event.kind}`,
    );
  }

  const maxAge = options.maxAgeSeconds ?? NIP98_VALIDITY_WINDOW_SECONDS;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - event.created_at) > maxAge) {
    throw new Error(
      'NIP-98 authorization token has expired or is outside clock drift window',
    );
  }

  const uTag = event.tags.find((t) => t[0] === 'u')?.[1];
  if (!uTag || sanitizeUrl(uTag) !== sanitizeUrl(expectedUrl)) {
    throw new Error(
      `NIP-98 target URL mismatch: expected "${expectedUrl}", found "${uTag || ''}"`,
    );
  }

  const methodTag = event.tags.find((t) => t[0] === 'method')?.[1];
  if (!methodTag || methodTag.toUpperCase() !== expectedMethod.toUpperCase()) {
    throw new Error(
      `NIP-98 HTTP method mismatch: expected "${expectedMethod}", found "${methodTag || ''}"`,
    );
  }

  if (options.expectedSha256) {
    const xTag = event.tags.find((t) => t[0] === 'x')?.[1];
    const sanitizedExpected = sanitizeSha256(options.expectedSha256);
    if (!xTag || sanitizeSha256(xTag) !== sanitizedExpected) {
      throw new Error('NIP-98 payload hash mismatch');
    }
  }

  if (!verifyEvent(event)) {
    throw new Error(
      'Cryptographic signature verification failed for NIP-98 event',
    );
  }

  return event;
}

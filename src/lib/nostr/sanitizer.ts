/**
 * Security & Sanitization Utilities for Nostr Content
 * Protects against XSS, protocol injection, and malformed relay payloads.
 * photo.emre.xyz
 */

/**
 * Escapes HTML characters to prevent XSS injection in raw HTML rendering.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Strips HTML tags and controls string length cleanly.
 */
export function sanitizeText(value: unknown, maxLength = 2000): string {
  if (typeof value !== 'string') {
    return '';
  }
  // Strip all HTML tags
  const stripped = value.replace(/<[^>]*>?/gm, '').trim();
  if (stripped.length > maxLength) {
    return stripped.slice(0, maxLength);
  }
  return stripped;
}

/**
 * Validates and sanitizes URLs.
 * Strictly permits only standard HTTP/HTTPS protocols to prevent javascript: or data: XSS attacks.
 */
export function sanitizeUrl(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Validates a SHA-256 hex string (64 characters, hex only).
 */
export function sanitizeSha256(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const clean = value.trim().toLowerCase();
  if (/^[a-f0-9]{64}$/.test(clean)) {
    return clean;
  }
  return null;
}

/**
 * Validates a 64-character hex public key.
 */
export function sanitizePubkey(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const clean = value.trim().toLowerCase();
  if (/^[a-f0-9]{64}$/.test(clean)) {
    return clean;
  }
  return null;
}

/**
 * Validates and sanitizes parameterized replaceable event coordinates.
 * Format: `<kind>:<pubkey>:<d-tag>`
 */
export function sanitizeCoordinate(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const parts = value.trim().split(':');
  if (parts.length < 3) {
    return null;
  }
  const kind = Number.parseInt(parts[0], 10);
  const pubkey = parts[1].toLowerCase();
  const dTag = parts.slice(2).join(':'); // d-tag may contain colons

  if (Number.isNaN(kind) || !/^[a-f0-9]{64}$/.test(pubkey) || !dTag) {
    return null;
  }

  return `${kind}:${pubkey}:${dTag}`;
}

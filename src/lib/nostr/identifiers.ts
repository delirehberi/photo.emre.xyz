/**
 * Nostr Event Album Identifier Resolution & Encoding
 * photo.emre.xyz
 *
 * Implements NIP-19 naddr, nevent, note, coordinate, and legacy slug decoding
 * to support canonical decentralized addressability for Kind 31922 event albums.
 */

import * as nip19 from 'nostr-tools/nip19';
import { isHex32 } from 'nostr-tools/utils';
import { NOSTR_KINDS, PRIMARY_RELAY } from './config';
import { sanitizeCoordinate, sanitizePubkey } from './sanitizer';

export type AlbumIdentifierType =
  'naddr' | 'nevent' | 'note' | 'hex' | 'coordinate' | 'slug';

export interface ResolvedAlbumTarget {
  type: AlbumIdentifierType;
  /** Filter for querying the album event */
  filter: {
    kinds?: number[];
    authors?: string[];
    '#d'?: string[];
    ids?: string[];
  };
  /** Optional relay hints extracted from NIP-19 entities */
  relays: string[];
  /** Canonical d-tag identifier if known */
  dTag?: string;
  /** Author public key if known */
  pubkey?: string;
  /** Canonical Nostr coordinate (31922:<pubkey>:<dTag>) if both pubkey and dTag are available */
  coordinate?: string;
}

/**
 * Extracts a canonical Nostr identifier or NIP-19 entity from raw input or full URLs.
 * Supports:
 * - Direct NIP-19 entities: naddr1..., nevent1..., note1...
 * - URLs: https://ditto.pub/naddr1..., https://coracle.social/naddr1..., https://primal.net/e/nevent1...
 * - nostr: URIs: nostr:naddr1...
 */
export function extractNip19FromInput(rawInput: string): string {
  if (!rawInput || typeof rawInput !== 'string') return '';
  const trimmed = rawInput.trim();

  // 1. Strip 'nostr:' protocol prefix if present
  const withoutProtocol = trimmed.replace(/^nostr:/i, '').trim();

  // 2. Look for embedded NIP-19 bech32 entity inside URL paths or query strings
  const nip19Match = withoutProtocol.match(
    /\b(naddr1[a-z0-9]+|nevent1[a-z0-9]+|note1[a-z0-9]+)\b/i,
  );
  if (nip19Match) {
    return nip19Match[1].toLowerCase();
  }

  // 3. Return trimmed string (could be a coordinate '31923:pubkey:dTag', hex ID, or slug)
  return withoutProtocol;
}

/**
 * Encodes a Kind 31922 or Kind 31923 event album into a canonical NIP-19 naddr string.
 */
export function encodeAlbumNaddr(album: {
  pubkey: string;
  dTag: string;
  kind?: number;
  relays?: readonly string[] | string[];
}): string {
  const cleanPubkey = sanitizePubkey(album.pubkey);
  if (!cleanPubkey) {
    throw new Error(`Invalid pubkey for naddr encoding: ${album.pubkey}`);
  }

  const cleanDTag = (album.dTag || '').trim();
  if (!cleanDTag) {
    throw new Error('Album d-tag identifier is required for naddr encoding');
  }

  const relayHints =
    album.relays && album.relays.length > 0
      ? Array.from(album.relays).slice(0, 3)
      : [PRIMARY_RELAY];

  const targetKind = album.kind || NOSTR_KINDS.EVENT_ALBUM;

  return nip19.naddrEncode({
    kind: targetKind,
    pubkey: cleanPubkey,
    identifier: cleanDTag,
    relays: relayHints,
  });
}

/**
 * Parses and resolves any album input into structured Nostr query filters and relay hints.
 * Supports:
 * - URLs containing NIP-19 entities (e.g. https://ditto.pub/naddr1...)
 * - naddr1... (NIP-19 parameterized replaceable event, e.g. Kind 31922 or 31923)
 * - nevent1... (NIP-19 event pointer with relay hints)
 * - note1... (NIP-19 event ID)
 * - 64-char hex event ID
 * - Canonical coordinate string ("31922:<pubkey>:<dTag>" or "<kind>:<pubkey>:<dTag>")
 * - Legacy d-tag slug (for backward-compatibility)
 */
export function resolveAlbumTarget(rawInput: string): ResolvedAlbumTarget {
  if (!rawInput || typeof rawInput !== 'string') {
    throw new Error('Invalid album identifier: empty or non-string input');
  }

  const input = extractNip19FromInput(rawInput);
  if (!input) {
    throw new Error('Invalid album identifier: empty input after extraction');
  }

  // 1. Check for NIP-19 encoded string (naddr1, nevent1, note1)
  if (
    input.startsWith('naddr1') ||
    input.startsWith('nevent1') ||
    input.startsWith('note1')
  ) {
    try {
      const decoded = nip19.decode(input);

      if (decoded.type === 'naddr') {
        const data = decoded.data as {
          kind: number;
          pubkey: string;
          identifier: string;
          relays?: string[];
        };

        const targetKind = data.kind || NOSTR_KINDS.EVENT_ALBUM;
        const cleanPubkey = sanitizePubkey(data.pubkey);
        const cleanDTag = (data.identifier || '').trim();
        const relays = Array.isArray(data.relays)
          ? data.relays.filter(Boolean)
          : [];

        const coordinate =
          cleanPubkey && cleanDTag
            ? `${targetKind}:${cleanPubkey}:${cleanDTag}`
            : undefined;

        return {
          type: 'naddr',
          filter: {
            kinds: [targetKind],
            authors: cleanPubkey ? [cleanPubkey] : undefined,
            '#d': cleanDTag ? [cleanDTag] : undefined,
          },
          relays,
          dTag: cleanDTag || undefined,
          pubkey: cleanPubkey || undefined,
          coordinate,
        };
      }

      if (decoded.type === 'nevent') {
        const data = decoded.data as {
          id: string;
          relays?: string[];
          author?: string;
          kind?: number;
        };

        const cleanId = data.id.toLowerCase();
        const relays = Array.isArray(data.relays)
          ? data.relays.filter(Boolean)
          : [];
        const cleanPubkey = data.author
          ? sanitizePubkey(data.author)
          : undefined;

        return {
          type: 'nevent',
          filter: {
            ids: [cleanId],
            ...(cleanPubkey ? { authors: [cleanPubkey] } : {}),
            ...(data.kind ? { kinds: [data.kind] } : {}),
          },
          relays,
          pubkey: cleanPubkey || undefined,
        };
      }

      if (decoded.type === 'note') {
        const hexId = (decoded.data as string).toLowerCase();
        return {
          type: 'note',
          filter: {
            ids: [hexId],
          },
          relays: [],
        };
      }
    } catch {
      // If NIP-19 decode fails, continue evaluating alternative formats
    }
  }

  // 2. Check for 64-character hex event ID
  if (isHex32(input.toLowerCase())) {
    return {
      type: 'hex',
      filter: {
        ids: [input.toLowerCase()],
      },
      relays: [],
    };
  }

  // 3. Check for canonical coordinate format: <kind>:<pubkey>:<dTag>
  if (input.includes(':')) {
    const sanitized = sanitizeCoordinate(input);
    if (sanitized) {
      const [kindStr, pubkey, ...rest] = sanitized.split(':');
      const kind = Number.parseInt(kindStr, 10);
      const dTag = rest.join(':');

      if (!Number.isNaN(kind) && pubkey && dTag) {
        return {
          type: 'coordinate',
          filter: {
            kinds: [kind],
            authors: [pubkey],
            '#d': [dTag],
          },
          relays: [],
          dTag,
          pubkey,
          coordinate: `${kind}:${pubkey}:${dTag}`,
        };
      }
    }
  }

  // 4. Fallback: Legacy slug / d-tag identifier
  return {
    type: 'slug',
    filter: {
      kinds: [NOSTR_KINDS.EVENT_ALBUM],
      '#d': [input],
    },
    relays: [],
    dTag: input,
  };
}

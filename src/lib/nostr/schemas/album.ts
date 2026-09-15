/**
 * Kind 31922: Event Album (NIP-52 Time-based Calendar Event Album)
 * photo.emre.xyz
 */

import { NOSTR_KINDS } from '../config';
import {
  sanitizeCoordinate,
  sanitizePubkey,
  sanitizeText,
  sanitizeUrl,
} from '../sanitizer';
import type { NostrEvent, EventTemplate, EventAlbum } from '../types';

/**
 * Formats a canonical Nostr coordinate for an Event Album.
 * Format: 31922:<pubkey>:<d-tag>
 */
/**
 * Formats a canonical Nostr coordinate for an Event Album.
 * Format: <kind>:<pubkey>:<d-tag> (e.g. 31922:<pubkey>:<dTag> or 31923:<pubkey>:<dTag>)
 */
export function formatAlbumCoordinate(
  pubkey: string,
  dTag: string,
  kind: number = NOSTR_KINDS.EVENT_ALBUM,
): string {
  const cleanPubkey = sanitizePubkey(pubkey);
  if (!cleanPubkey) {
    throw new Error(`Invalid pubkey for coordinate: ${pubkey}`);
  }
  const cleanDTag = dTag.trim();
  if (!cleanDTag) {
    throw new Error('Album d-tag identifier cannot be empty');
  }
  const targetKind =
    kind && !Number.isNaN(kind) ? kind : NOSTR_KINDS.EVENT_ALBUM;
  return `${targetKind}:${cleanPubkey}:${cleanDTag}`;
}

/**
 * Parses a canonical Nostr coordinate string into its component parts.
 * Supports NIP-52 Calendar Event coordinates (31922, 31923) and parameterized replaceable kinds.
 */
export function parseAlbumCoordinate(coordinate: string): {
  kind: number;
  pubkey: string;
  dTag: string;
} {
  const sanitized = sanitizeCoordinate(coordinate);
  if (!sanitized) {
    throw new Error(`Invalid event coordinate: ${coordinate}`);
  }

  const [kindStr, pubkey, ...rest] = sanitized.split(':');
  const kind = Number.parseInt(kindStr, 10);
  const dTag = rest.join(':');

  if (Number.isNaN(kind) || kind <= 0) {
    throw new Error(`Invalid coordinate kind: ${kindStr}`);
  }

  return { kind, pubkey, dTag };
}

/**
 * Parses a NIP-52 Nostr event (Kind 31922 Date-based or Kind 31923 Time-based) into an EventAlbum entity.
 */
export function parseEventAlbum(event: NostrEvent): EventAlbum {
  const isSupportedKind =
    event.kind === NOSTR_KINDS.EVENT_ALBUM ||
    event.kind === NOSTR_KINDS.CALENDAR_EVENT_TIME;

  if (!isSupportedKind) {
    throw new Error(
      `Invalid event kind: expected ${NOSTR_KINDS.EVENT_ALBUM} or ${NOSTR_KINDS.CALENDAR_EVENT_TIME}, received ${event.kind}`,
    );
  }

  const pubkey = sanitizePubkey(event.pubkey);
  if (!pubkey) {
    throw new Error('Invalid author pubkey on Event Album');
  }

  let dTag = '';
  let title = '';
  let summary = '';
  let coverImage: string | undefined;
  let startDate: number | undefined;
  let endDate: number | undefined;
  let location: string | undefined;
  const tags: string[] = [];

  for (const tag of event.tags) {
    if (!Array.isArray(tag) || tag.length < 2) continue;
    const [tagName, tagValue] = tag;

    switch (tagName) {
      case 'd':
        dTag = tagValue.trim();
        break;
      case 'title':
      case 'name':
        if (!title) title = sanitizeText(tagValue, 200);
        break;
      case 'summary':
      case 'description':
        if (!summary) summary = sanitizeText(tagValue, 500);
        break;
      case 'image':
      case 'thumb':
        if (!coverImage) coverImage = sanitizeUrl(tagValue) || undefined;
        break;
      case 'start': {
        const parsed = Number.parseInt(tagValue, 10);
        if (!Number.isNaN(parsed) && parsed > 0) {
          startDate = parsed;
        } else {
          const parsedDate = new Date(tagValue).getTime();
          if (!Number.isNaN(parsedDate) && parsedDate > 0) {
            startDate = Math.floor(parsedDate / 1000);
          }
        }
        break;
      }
      case 'end': {
        const parsed = Number.parseInt(tagValue, 10);
        if (!Number.isNaN(parsed) && parsed > 0) {
          endDate = parsed;
        } else {
          const parsedDate = new Date(tagValue).getTime();
          if (!Number.isNaN(parsedDate) && parsedDate > 0) {
            endDate = Math.floor(parsedDate / 1000);
          }
        }
        break;
      }
      case 'location':
        location = sanitizeText(tagValue, 200);
        break;
      case 't': {
        const cleanTag = sanitizeText(tagValue, 50).toLowerCase();
        if (cleanTag && !tags.includes(cleanTag)) {
          tags.push(cleanTag);
        }
        break;
      }
    }
  }

  if (!dTag) {
    throw new Error('Missing mandatory "d" tag on Event Album');
  }

  const description = sanitizeText(event.content, 10000) || undefined;
  const coordinate = formatAlbumCoordinate(pubkey, dTag, event.kind);

  return {
    id: event.id,
    pubkey,
    dTag,
    title: title || dTag,
    summary: summary || title || dTag,
    description,
    coverImage,
    startDate,
    endDate,
    location,
    tags,
    coordinate,
    kind: event.kind,
    createdAt: event.created_at,
  };
}

/**
 * Creates an unsigned EventTemplate for a NIP-52 Event Album (Kind 31922 or 31923).
 */
export function createEventAlbumTemplate(params: {
  dTag: string;
  title: string;
  summary: string;
  kind?: number;
  description?: string;
  coverImage?: string;
  startDate?: number;
  endDate?: number;
  location?: string;
  tags?: string[];
  sourceCoordinate?: string;
  sourceEventId?: string;
}): EventTemplate {
  const cleanDTag = params.dTag.trim();
  if (!cleanDTag) {
    throw new Error('dTag is required to create an Event Album');
  }

  const tags: string[][] = [
    ['d', cleanDTag],
    ['title', params.title.trim()],
    ['summary', params.summary.trim()],
  ];

  if (params.coverImage?.trim()) {
    tags.push(['image', params.coverImage.trim()]);
  }

  if (params.startDate && params.startDate > 0) {
    tags.push(['start', params.startDate.toString()]);
  }

  if (params.endDate && params.endDate > 0) {
    tags.push(['end', params.endDate.toString()]);
  }

  if (params.location?.trim()) {
    tags.push(['location', params.location.trim()]);
  }

  if (params.sourceCoordinate?.trim()) {
    tags.push(['a', params.sourceCoordinate.trim(), '', 'source']);
  }

  if (params.sourceEventId?.trim()) {
    tags.push(['e', params.sourceEventId.trim(), '', 'source']);
  }

  if (params.tags && Array.isArray(params.tags)) {
    for (const tag of params.tags) {
      const clean = tag.trim().toLowerCase();
      if (clean) {
        tags.push(['t', clean]);
      }
    }
  }

  return {
    kind: params.kind || NOSTR_KINDS.EVENT_ALBUM,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: params.description?.trim() || '',
  };
}

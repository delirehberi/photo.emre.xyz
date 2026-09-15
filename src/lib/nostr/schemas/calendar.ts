/**
 * Kind 31924: NIP-52 Calendar Lists (Monthly Federated Curation)
 * photo.emre.xyz
 */

import { NOSTR_KINDS } from '../config';
import { sanitizeCoordinate, sanitizePubkey, sanitizeText } from '../sanitizer';
import type { NostrEvent, EventTemplate, CalendarList } from '../types';

/**
 * Formats a monthly partition identifier (e.g. "events-2026-09").
 */
export function formatMonthDTag(timestampOrDate?: number | Date): string {
  const d =
    timestampOrDate instanceof Date
      ? timestampOrDate
      : typeof timestampOrDate === 'number' && timestampOrDate > 0
        ? new Date(timestampOrDate * 1000)
        : new Date();

  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `events-${year}-${month}`;
}

/**
 * Returns an array of monthly d-tags spanning the previous, current, and next months.
 * Used to query relays for the active browsing window.
 */
export function getAdjacentMonthDTags(centerDate: Date = new Date()): string[] {
  const currentYear = centerDate.getUTCFullYear();
  const currentMonth = centerDate.getUTCMonth(); // 0-indexed

  const prev = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
  const curr = new Date(Date.UTC(currentYear, currentMonth, 1));
  const next = new Date(Date.UTC(currentYear, currentMonth + 1, 1));

  return [formatMonthDTag(prev), formatMonthDTag(curr), formatMonthDTag(next)];
}

/**
 * Parses a Kind 31924 Nostr event into a typed CalendarList entity.
 */
export function parseCalendarList(event: NostrEvent): CalendarList {
  if (event.kind !== NOSTR_KINDS.CALENDAR_LIST) {
    throw new Error(
      `Invalid event kind: expected ${NOSTR_KINDS.CALENDAR_LIST}, received ${event.kind}`,
    );
  }

  const pubkey = sanitizePubkey(event.pubkey);
  if (!pubkey) {
    throw new Error('Invalid author pubkey on Kind 31924 Calendar List');
  }

  let dTag = '';
  let title: string | undefined;
  let description: string | undefined;
  const coordinatesSet = new Set<string>();

  for (const tag of event.tags) {
    if (!Array.isArray(tag) || tag.length < 2) continue;
    const [tagName, tagValue] = tag;

    switch (tagName.toLowerCase()) {
      case 'd':
        dTag = tagValue.trim();
        break;
      case 'title':
      case 'name':
        if (!title) title = sanitizeText(tagValue, 200);
        break;
      case 'description':
      case 'summary':
        if (!description) description = sanitizeText(tagValue, 500);
        break;
      case 'a': {
        const cleanCoord = sanitizeCoordinate(tagValue);
        if (cleanCoord) {
          coordinatesSet.add(cleanCoord);
        }
        break;
      }
    }
  }

  if (!dTag) {
    throw new Error('Missing mandatory "d" tag on Kind 31924 Calendar List');
  }

  const contentDesc = sanitizeText(event.content, 5000) || undefined;

  return {
    id: event.id,
    pubkey,
    dTag,
    title: title || dTag,
    description: description || contentDesc,
    coordinates: Array.from(coordinatesSet),
    createdAt: event.created_at,
  };
}

/**
 * Creates an unsigned EventTemplate for a NIP-52 Kind 31924 Calendar List.
 */
export function createCalendarListTemplate(params: {
  dTag: string;
  title?: string;
  description?: string;
  coordinates: string[];
  relayHints?: Record<string, string>;
}): EventTemplate {
  const cleanDTag = params.dTag.trim();
  if (!cleanDTag) {
    throw new Error('dTag is required to create a Calendar List');
  }

  const tags: string[][] = [['d', cleanDTag]];

  if (params.title?.trim()) {
    tags.push(['title', params.title.trim()]);
  }

  if (params.description?.trim()) {
    tags.push(['description', params.description.trim()]);
  }

  // Deduplicate and sanitize coordinates
  const uniqueCoordinates = Array.from(new Set(params.coordinates));
  for (const coord of uniqueCoordinates) {
    const cleanCoord = sanitizeCoordinate(coord);
    if (cleanCoord) {
      const relayHint = params.relayHints?.[cleanCoord] || '';
      tags.push(relayHint ? ['a', cleanCoord, relayHint] : ['a', cleanCoord]);
    }
  }

  return {
    kind: NOSTR_KINDS.CALENDAR_LIST,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: params.description?.trim() || '',
  };
}

/**
 * Event Albums Data Fetcher
 * photo.emre.xyz
 *
 * Production-ready Nostr data layer for Kind 31922 event albums,
 * Kind 1063 photo counters, and Kind 0 organization profiles.
 */

import { getSharedRelayPool } from './pool';
import { DEFAULT_RELAYS, NOSTR_KINDS } from './config';
import { parseEventAlbum } from './schemas/album';
import { parseProfileEvent } from './schemas/profile';
import type { EventAlbum, OrganizationProfile } from './types';

export interface EventWithOrg {
  album: EventAlbum;
  org: OrganizationProfile | null;
  photoCount: number;
}

/**
 * Fetches all live event albums (Kind 31922 tagged with 'event-album'),
 * counts their photos (Kind 1063), and resolves author organization profiles.
 */
export async function fetchEventAlbums(): Promise<EventWithOrg[]> {
  const result: EventWithOrg[] = [];
  const knownCoordinates = new Set<string>();

  try {
    const pool = getSharedRelayPool();
    // Query Kind 31922 events tagged with 'event-album'
    const events = await pool.queryEvents(
      DEFAULT_RELAYS,
      {
        kinds: [NOSTR_KINDS.EVENT_ALBUM],
        '#t': ['event-album'],
      },
      { timeoutMs: 3000 },
    );

    for (const ev of events) {
      try {
        const parsedAlbum = parseEventAlbum(ev);
        if (!knownCoordinates.has(parsedAlbum.coordinate)) {
          knownCoordinates.add(parsedAlbum.coordinate);
          result.push({
            album: parsedAlbum,
            org: null,
            photoCount: 0,
          });
        }
      } catch {
        // Discard invalid album events
      }
    }
  } catch (err) {
    console.warn('Could not query live relay events:', err);
  }

  // If no albums found, return empty array immediately
  if (result.length === 0) {
    return [];
  }

  // Sort albums by start date or creation date (newest first)
  result.sort((a, b) => {
    const timeA = a.album.startDate || a.album.createdAt;
    const timeB = b.album.startDate || b.album.createdAt;
    return timeB - timeA;
  });

  // Parallel batch queries for photos and author profiles
  const coordinates = result.map((item) => item.album.coordinate);
  const authorPubkeys = Array.from(
    new Set(result.map((item) => item.album.pubkey)),
  );

  const pool = getSharedRelayPool();

  const photoPromise =
    coordinates.length > 0
      ? pool
          .queryEvents(
            DEFAULT_RELAYS,
            {
              kinds: [NOSTR_KINDS.PHOTO_METADATA],
              '#a': coordinates,
            },
            { timeoutMs: 2500 },
          )
          .catch((err) => {
            console.warn('Could not query photo counts for albums:', err);
            return [];
          })
      : Promise.resolve([]);

  const profilePromise =
    authorPubkeys.length > 0
      ? pool
          .queryEvents(
            DEFAULT_RELAYS,
            {
              kinds: [NOSTR_KINDS.METADATA],
              authors: authorPubkeys,
            },
            { timeoutMs: 2500 },
          )
          .catch((err) => {
            console.warn('Could not query author profiles from relay:', err);
            return [];
          })
      : Promise.resolve([]);

  const [photoSettled, profileSettled] = await Promise.allSettled([
    photoPromise,
    profilePromise,
  ]);

  if (photoSettled.status === 'fulfilled' && photoSettled.value.length > 0) {
    const countMap = new Map<string, number>();
    for (const pe of photoSettled.value) {
      for (const tag of pe.tags) {
        if (Array.isArray(tag) && tag[0] === 'a' && tag[1]) {
          countMap.set(tag[1], (countMap.get(tag[1]) || 0) + 1);
        }
      }
    }

    for (const item of result) {
      item.photoCount = countMap.get(item.album.coordinate) || 0;
    }
  }

  if (
    profileSettled.status === 'fulfilled' &&
    profileSettled.value.length > 0
  ) {
    const profileMap = new Map<string, OrganizationProfile>();
    for (const pe of profileSettled.value) {
      try {
        const profile = parseProfileEvent(pe);
        const existing = profileMap.get(profile.pubkey);
        if (!existing || profile.createdAt > existing.createdAt) {
          profileMap.set(profile.pubkey, profile);
        }
      } catch {
        // Skip invalid profile events
      }
    }

    for (const item of result) {
      item.org = profileMap.get(item.album.pubkey) || null;
    }
  }

  return result;
}

/**
 * Resolves an organization profile and all event albums authored by that pubkey.
 */
export async function fetchOrgWithEvents(pubkey: string): Promise<{
  org: OrganizationProfile;
  events: EventAlbum[];
}> {
  let org: OrganizationProfile | null = null;

  try {
    const pool = getSharedRelayPool();
    const profileEv = await pool.queryOne(DEFAULT_RELAYS, {
      kinds: [NOSTR_KINDS.METADATA],
      authors: [pubkey],
    });

    if (profileEv) {
      org = parseProfileEvent(profileEv);
    }
  } catch (err) {
    console.warn('Could not fetch org profile from relay:', err);
  }

  if (!org) {
    org = {
      pubkey,
      name: `org-${pubkey.slice(0, 8)}`,
      displayName: `Organizasyon (${pubkey.slice(0, 8)})`,
      about: 'Nostr ağı üzerinde bağımsız etkinlik organizasyonu.',
      picture: '',
      createdAt: Math.floor(Date.now() / 1000),
    };
  }

  const events: EventAlbum[] = [];
  const knownD = new Set<string>();

  try {
    const pool = getSharedRelayPool();
    const albumEvents = await pool.queryEvents(
      DEFAULT_RELAYS,
      {
        kinds: [NOSTR_KINDS.EVENT_ALBUM],
        authors: [pubkey],
      },
      { timeoutMs: 3000 },
    );

    for (const ev of albumEvents) {
      try {
        const parsed = parseEventAlbum(ev);
        if (!knownD.has(parsed.dTag)) {
          knownD.add(parsed.dTag);
          events.push(parsed);
        }
      } catch {
        // Skip invalid album events
      }
    }
  } catch (err) {
    console.warn('Could not query events for pubkey:', err);
  }

  // Sort events newest first
  events.sort((a, b) => {
    const timeA = a.startDate || a.createdAt;
    const timeB = b.startDate || b.createdAt;
    return timeB - timeA;
  });

  return { org, events };
}

/**
 * Formats an event Unix timestamp (seconds) into a localized date string,
 * automatically including hours and minutes if a specific non-midnight time was specified.
 */
export function formatEventDateTime(
  timestampSeconds: number,
  locale: string = 'tr',
  endDateSeconds?: number,
): string {
  if (!timestampSeconds || timestampSeconds <= 0) return '';
  const date = new Date(timestampSeconds * 1000);
  const localeCode = locale === 'en' ? 'en-US' : 'tr-TR';

  // Check if timestamp represents midnight UTC (standard for date-only entries)
  const isUtcMidnight =
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0;

  // Check if timestamp represents midnight local
  const isLocalMidnight =
    date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0;

  const isDateOnly = isUtcMidnight || isLocalMidnight;

  const formatOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(isUtcMidnight ? { timeZone: 'UTC' } : {}),
    ...(!isDateOnly ? { hour: '2-digit', minute: '2-digit' } : {}),
  };

  const startFormatted = date.toLocaleDateString(localeCode, formatOptions);

  if (endDateSeconds && endDateSeconds > timestampSeconds) {
    const endDate = new Date(endDateSeconds * 1000);
    const isEndUtcMidnight =
      endDate.getUTCHours() === 0 &&
      endDate.getUTCMinutes() === 0 &&
      endDate.getUTCSeconds() === 0;
    const isEndLocalMidnight =
      endDate.getHours() === 0 &&
      endDate.getMinutes() === 0 &&
      endDate.getSeconds() === 0;
    const isEndDateOnly = isEndUtcMidnight || isEndLocalMidnight;

    const endFormatOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(isEndUtcMidnight ? { timeZone: 'UTC' } : {}),
      ...(!isEndDateOnly ? { hour: '2-digit', minute: '2-digit' } : {}),
    };

    // If same calendar day
    const sameDay =
      (isUtcMidnight &&
        date.getUTCFullYear() === endDate.getUTCFullYear() &&
        date.getUTCMonth() === endDate.getUTCMonth() &&
        date.getUTCDate() === endDate.getUTCDate()) ||
      (!isUtcMidnight &&
        date.getFullYear() === endDate.getFullYear() &&
        date.getMonth() === endDate.getMonth() &&
        date.getDate() === endDate.getDate());

    if (sameDay) {
      if (!isEndDateOnly) {
        const endTimeStr = endDate.toLocaleTimeString(localeCode, {
          hour: '2-digit',
          minute: '2-digit',
        });
        return `${startFormatted} – ${endTimeStr}`;
      }
      return startFormatted;
    }

    const endFormatted = endDate.toLocaleDateString(
      localeCode,
      endFormatOptions,
    );
    return `${startFormatted} – ${endFormatted}`;
  }

  return startFormatted;
}

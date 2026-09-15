/**
 * Event Albums Data Fetcher
 * photo.emre.xyz
 *
 * Production-ready Nostr data layer for Kind 31922 event albums,
 * Kind 1063 photo counters, and Kind 0 organization profiles.
 */

import { getSharedRelayPool } from './pool';
import { ADMIN_PUBKEY, DEFAULT_RELAYS, NOSTR_KINDS } from './config';
import { parseEventAlbum, parseAlbumCoordinate } from './schemas/album';
import { parseCalendarList, getAdjacentMonthDTags } from './schemas/calendar';
import { parseProfileEvent } from './schemas/profile';
import type { EventAlbum, OrganizationProfile } from './types';

export interface EventWithOrg {
  album: EventAlbum;
  org: OrganizationProfile | null;
  photoCount: number;
}

/**
 * Fetches all live event albums from:
 * 1. Federated NIP-52 monthly calendar lists (Kind 31924) across ALL users for active months.
 * 2. Legacy Kind 31922 and 31923 events tagged with 'event-album'.
 * Counts their photos (Kind 1063), resolves author profiles, and flags curated events.
 */
export async function fetchEventAlbums(): Promise<EventWithOrg[]> {
  const result: EventWithOrg[] = [];
  const knownCoordinates = new Set<string>();
  const curatedCoordinates = new Set<string>();
  const curatorsByCoordinate = new Map<string, Set<string>>();

  try {
    const pool = getSharedRelayPool();
    const monthDTags = getAdjacentMonthDTags();

    // Parallel fetch:
    // 1. All Kind 31924 monthly calendar lists across ALL authors for active months
    // 2. Legacy Kind 31922 & 31923 events tagged with 'event-album'
    const [calendarEvents, legacyAlbumEvents] = await Promise.all([
      pool
        .queryEvents(
          DEFAULT_RELAYS,
          {
            kinds: [NOSTR_KINDS.CALENDAR_LIST],
            '#d': monthDTags,
          },
          { timeoutMs: 3000 },
        )
        .catch((err) => {
          console.warn('Could not query calendar lists from relays:', err);
          return [];
        }),
      pool
        .queryEvents(
          DEFAULT_RELAYS,
          {
            kinds: [NOSTR_KINDS.EVENT_ALBUM, NOSTR_KINDS.CALENDAR_EVENT_TIME],
            '#t': ['event-album'],
          },
          { timeoutMs: 3000 },
        )
        .catch((err) => {
          console.warn('Could not query legacy album events from relays:', err);
          return [];
        }),
    ]);

    // Process legacy albums first
    for (const ev of legacyAlbumEvents) {
      try {
        const parsed = parseEventAlbum(ev);
        if (!knownCoordinates.has(parsed.coordinate)) {
          knownCoordinates.add(parsed.coordinate);
          result.push({
            album: parsed,
            org: null,
            photoCount: 0,
          });
        }
      } catch {
        // Discard invalid album events
      }
    }

    // Process Kind 31924 federated calendar lists across all users
    const missingCoordinates: Array<{
      kind: number;
      pubkey: string;
      dTag: string;
      coordinate: string;
    }> = [];

    for (const ev of calendarEvents) {
      try {
        const list = parseCalendarList(ev);
        const isFromAdmin =
          ev.pubkey.toLowerCase() === ADMIN_PUBKEY.toLowerCase();

        for (const coord of list.coordinates) {
          if (isFromAdmin) {
            curatedCoordinates.add(coord);
          }
          if (!curatorsByCoordinate.has(coord)) {
            curatorsByCoordinate.set(coord, new Set());
          }
          curatorsByCoordinate.get(coord)!.add(ev.pubkey);

          if (!knownCoordinates.has(coord)) {
            try {
              const { kind, pubkey, dTag } = parseAlbumCoordinate(coord);
              missingCoordinates.push({
                kind,
                pubkey,
                dTag,
                coordinate: coord,
              });
              knownCoordinates.add(coord);
            } catch {
              // Ignore malformed coordinate
            }
          }
        }
      } catch {
        // Discard invalid calendar lists
      }
    }

    // If there are coordinates in calendar lists that we haven't loaded yet, batch fetch them
    if (missingCoordinates.length > 0) {
      const kinds = Array.from(new Set(missingCoordinates.map((c) => c.kind)));
      const authors = Array.from(
        new Set(missingCoordinates.map((c) => c.pubkey)),
      );
      const dTags = Array.from(new Set(missingCoordinates.map((c) => c.dTag)));

      const fetchedCalendarEvents = await pool
        .queryEvents(
          DEFAULT_RELAYS,
          {
            kinds,
            authors,
            '#d': dTags,
          },
          { timeoutMs: 3500 },
        )
        .catch((err) => {
          console.warn(
            'Could not batch query referenced calendar events:',
            err,
          );
          return [];
        });

      for (const ev of fetchedCalendarEvents) {
        try {
          const parsed = parseEventAlbum(ev);
          result.push({
            album: parsed,
            org: null,
            photoCount: 0,
          });
        } catch {
          // Discard invalid
        }
      }
    }

    // Attach curation metadata to all result items
    for (const item of result) {
      item.album.isCurated = curatedCoordinates.has(item.album.coordinate);
      const curators = curatorsByCoordinate.get(item.album.coordinate);
      if (curators && curators.size > 0) {
        item.album.curatorPubkeys = Array.from(curators);
      }
    }
  } catch (err) {
    console.warn('Could not query live relay events:', err);
  }

  // If no albums found, return empty array immediately
  if (result.length === 0) {
    return [];
  }

  // Sort albums: curated first, then newest start date or creation date
  result.sort((a, b) => {
    if (a.album.isCurated && !b.album.isCurated) return -1;
    if (!a.album.isCurated && b.album.isCurated) return 1;

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
  const pool = getSharedRelayPool();

  const profilePromise = pool
    .queryOne(
      DEFAULT_RELAYS,
      {
        kinds: [NOSTR_KINDS.METADATA],
        authors: [pubkey],
      },
      { timeoutMs: 3500 },
    )
    .catch((err) => {
      console.warn('Could not fetch org profile from relay:', err);
      return null;
    });

  const eventsPromise = pool
    .queryEvents(
      DEFAULT_RELAYS,
      {
        kinds: [NOSTR_KINDS.EVENT_ALBUM],
        authors: [pubkey],
      },
      { timeoutMs: 3500 },
    )
    .catch((err) => {
      console.warn('Could not query events for pubkey:', err);
      return [];
    });

  const [profileResult, eventsResult] = await Promise.allSettled([
    profilePromise,
    eventsPromise,
  ]);

  let org: OrganizationProfile | null = null;
  if (profileResult.status === 'fulfilled' && profileResult.value) {
    try {
      org = parseProfileEvent(profileResult.value);
    } catch {
      // Invalid profile format
    }
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

  if (
    eventsResult.status === 'fulfilled' &&
    Array.isArray(eventsResult.value)
  ) {
    for (const ev of eventsResult.value) {
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

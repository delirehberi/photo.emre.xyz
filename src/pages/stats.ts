/**
 * Public Telemetry & Health Statistics Endpoint: /stats
 * photo.emre.xyz
 *
 * Provides public JSON telemetry including application version, platform info,
 * Nostr relay/Blossom infrastructure configuration, and aggregated album/photo statistics.
 */

import type { APIRoute } from 'astro';
import { APP_VERSION, APP_BUILD_INFO } from '../lib/version';
import {
  DEFAULT_RELAYS,
  PRIMARY_RELAY,
  GLOBAL_RELAYS,
  NOSTR_KINDS,
} from '../lib/nostr/config';
import {
  CURATED_BLOSSOM_SERVERS,
  DEFAULT_BLOSSOM_SERVER_URL,
} from '../lib/blossom/servers';
import { fetchEventAlbums } from '../lib/nostr/events-data';

export const prerender = false;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
} as const;

const CACHE_HEADERS = {
  'Cache-Control':
    'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
  'Content-Type': 'application/json; charset=utf-8',
} as const;

/**
 * Supported Nostr Kinds descriptive catalog
 */
const SUPPORTED_KINDS = [
  {
    kind: NOSTR_KINDS.EVENT_ALBUM,
    name: 'Event Album (Date-based)',
    nip: 'NIP-52 / Phoem',
    description: 'Calendar event representing photo album metadata and dates',
  },
  {
    kind: NOSTR_KINDS.CALENDAR_EVENT_TIME,
    name: 'Event Album (Time-based)',
    nip: 'NIP-52',
    description: 'Time-specified event album metadata',
  },
  {
    kind: NOSTR_KINDS.CALENDAR_LIST,
    name: 'Calendar Event List',
    nip: 'NIP-52',
    description: 'Monthly federated curation and album collection list',
  },
  {
    kind: NOSTR_KINDS.PHOTO_METADATA,
    name: 'File Metadata',
    nip: 'NIP-94 / NIP-68',
    description: 'Blossom media attachment and photo metadata event',
  },
  {
    kind: NOSTR_KINDS.PICTURE_EVENT,
    name: 'Picture Event',
    nip: 'NIP-68',
    description: 'Multi-image post with embedded imeta tags',
  },
  {
    kind: NOSTR_KINDS.METADATA,
    name: 'User / Org Profile Metadata',
    nip: 'NIP-01',
    description: 'Organization and photographer public profile',
  },
  {
    kind: NOSTR_KINDS.BLOSSOM_SERVER_LIST,
    name: 'Blossom Server List',
    nip: 'BUD-04',
    description: 'User preferred Blossom media server directory',
  },
  {
    kind: NOSTR_KINDS.ZAP_RECEIPT,
    name: 'Zap Receipt',
    nip: 'NIP-57',
    description: 'Lightning Network payment and zap receipt verification',
  },
];

/**
 * Builds the stats response object
 */
export async function buildStatsPayload(envMode?: string) {
  const now = new Date();
  const unixTimestamp = Math.floor(now.getTime() / 1000);

  // Fallback defaults in case relay fetch fails or times out
  let totalAlbums = 0;
  let curatedAlbums = 0;
  let totalPhotos = 0;
  const organizerPubkeys = new Set<string>();
  let latestEventTimestamp: number | null = null;

  try {
    const albumsWithOrg = await fetchEventAlbums();
    totalAlbums = albumsWithOrg.length;

    for (const item of albumsWithOrg) {
      if (item.album.isCurated) {
        curatedAlbums += 1;
      }
      totalPhotos += item.photoCount || 0;
      if (item.album.pubkey) {
        organizerPubkeys.add(item.album.pubkey);
      }
      const eventTime = item.album.startDate || item.album.createdAt;
      if (
        eventTime &&
        (!latestEventTimestamp || eventTime > latestEventTimestamp)
      ) {
        latestEventTimestamp = eventTime;
      }
    }
  } catch (err) {
    console.warn('Error computing live stats from Nostr relays:', err);
  }

  return {
    status: 'ok',
    version: APP_VERSION,
    environment: envMode || import.meta.env.MODE || 'production',
    timestamp: now.toISOString(),
    unixTimestamp,
    platform: {
      name: 'Phoem',
      description: APP_BUILD_INFO.description,
      repository: APP_BUILD_INFO.repository,
      license: APP_BUILD_INFO.license,
      releaseDate: APP_BUILD_INFO.releaseDate,
    },
    stats: {
      totalAlbums,
      curatedAlbums,
      totalPhotos,
      totalOrganizers: organizerPubkeys.size,
      latestEventTimestamp,
      latestEventDate: latestEventTimestamp
        ? new Date(latestEventTimestamp * 1000).toISOString().split('T')[0]
        : null,
    },
    network: {
      relays: {
        count: DEFAULT_RELAYS.length,
        primary: PRIMARY_RELAY,
        global: GLOBAL_RELAYS,
        activeList: DEFAULT_RELAYS,
      },
      blossomServers: {
        count: CURATED_BLOSSOM_SERVERS.length,
        default: DEFAULT_BLOSSOM_SERVER_URL,
        curated: CURATED_BLOSSOM_SERVERS.map((s) => ({
          id: s.id,
          name: s.name,
          url: s.url,
          tag: s.tag,
        })),
      },
      supportedKinds: SUPPORTED_KINDS,
    },
    caching: {
      edgeCached: true,
      ttlSeconds: 300,
    },
  };
}

/**
 * OPTIONS: Pre-flight CORS handler
 */
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      ...CORS_HEADERS,
      'Access-Control-Max-Age': '86400',
    },
  });
};

/**
 * HEAD: Responds with headers only for health and uptime checks
 */
export const HEAD: APIRoute = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      ...CACHE_HEADERS,
    },
  });
};

/**
 * GET: Returns public stats and telemetry JSON
 */
export const GET: APIRoute = async () => {
  const payload = await buildStatsPayload();
  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      ...CACHE_HEADERS,
    },
  });
};

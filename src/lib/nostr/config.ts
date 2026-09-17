/**
 * Nostr Relay Mesh & Architecture Configuration
 * photo.emre.xyz
 */

/**
 * Primary high-throughput anchor relay.
 * Serves as the primary indexing and fast-read target.
 */
export const PRIMARY_RELAY = 'wss://relay.emre.xyz';

/**
 * Federated public relays for censorship-resistance, global discoverability,
 * and high-availability read redundancy.
 * Includes purplepag.es (the canonical global NIP-01 profile directory).
 */
export const GLOBAL_RELAYS = [
  'wss://purplepag.es',
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://relay.snort.social',
] as const;

/**
 * Dynamically resolved relay list from environment or robust defaults.
 */
const envRelaysRaw =
  (typeof process !== 'undefined' && process.env?.PUBLIC_DEFAULT_RELAYS) ||
  (typeof import.meta !== 'undefined' &&
    (import.meta as { env?: Record<string, string> }).env
      ?.PUBLIC_DEFAULT_RELAYS);

const parsedEnvRelays = envRelaysRaw
  ? envRelaysRaw
      .split(',')
      .map((r) => r.trim())
      .filter((r) => r.startsWith('ws://') || r.startsWith('wss://'))
  : null;

/**
 * Standard ordered relay list prioritizing active resilient relays.
 */
export const DEFAULT_RELAYS: readonly string[] =
  parsedEnvRelays && parsedEnvRelays.length > 0
    ? parsedEnvRelays
    : [PRIMARY_RELAY, ...GLOBAL_RELAYS];

/**
 * Default aggregated Nostr Cache Relay for accelerating read-only operations.
 */
export const DEFAULT_CACHE_RELAY = 'wss://cache.nostr.org.tr';

/**
 * Dynamically resolved cache relay endpoint from environment or default.
 */
const envCacheRelayRaw =
  (typeof process !== 'undefined' && process.env?.PUBLIC_CACHE_RELAY_URL) ||
  (typeof import.meta !== 'undefined' &&
    (import.meta as { env?: Record<string, string> }).env
      ?.PUBLIC_CACHE_RELAY_URL);

export const CACHE_RELAY_URL: string =
  envCacheRelayRaw &&
  (envCacheRelayRaw.startsWith('ws://') ||
    envCacheRelayRaw.startsWith('wss://'))
    ? envCacheRelayRaw.trim()
    : DEFAULT_CACHE_RELAY;

/**
 * Flag determining if read-only queries should be routed through the cache relay.
 */
const envUseCacheRelayRaw =
  (typeof process !== 'undefined' && process.env?.PUBLIC_USE_CACHE_RELAY) ||
  (typeof import.meta !== 'undefined' &&
    (import.meta as { env?: Record<string, string> }).env
      ?.PUBLIC_USE_CACHE_RELAY);

export const USE_CACHE_RELAY: boolean =
  envUseCacheRelayRaw !== undefined
    ? envUseCacheRelayRaw === 'true' || envUseCacheRelayRaw === '1'
    : true;

/**
 * Formats a single aggregated Cache Relay URL containing target upstream relays.
 * Example: wss://cache.nostr.org.tr?relays=wss://relay.damus.io,wss://nos.lol,wss://relay.primal.net
 *
 * @param upstreamRelays Target upstream relays to query via cache
 * @param cacheBaseUrl Base cache relay URL (defaults to CACHE_RELAY_URL)
 * @returns Parameterized Cache Relay WebSocket URL
 */
export function getCacheRelayUrl(
  upstreamRelays: readonly string[] = DEFAULT_RELAYS,
  cacheBaseUrl: string = CACHE_RELAY_URL,
): string {
  const cleanBase = (cacheBaseUrl || DEFAULT_CACHE_RELAY)
    .trim()
    .replace(/\/+$/, '');
  const candidateRelays =
    upstreamRelays && upstreamRelays.length > 0
      ? upstreamRelays
      : DEFAULT_RELAYS;

  const validUpstreams: string[] = [];
  const seen = new Set<string>();

  for (const r of candidateRelays) {
    if (!r || typeof r !== 'string') continue;
    const trimmed = r.trim().replace(/\/+$/, '');
    if (!trimmed.startsWith('ws://') && !trimmed.startsWith('wss://')) continue;

    // Avoid recursing if an input relay is already a parameterized cache relay URL
    if (trimmed.includes('?relays=')) {
      try {
        const url = new URL(trimmed);
        const nestedRelays = url.searchParams.get('relays');
        if (nestedRelays) {
          for (const sub of nestedRelays.split(',')) {
            const cleanSub = sub.trim().replace(/\/+$/, '');
            if (
              (cleanSub.startsWith('ws://') || cleanSub.startsWith('wss://')) &&
              !seen.has(cleanSub)
            ) {
              seen.add(cleanSub);
              validUpstreams.push(cleanSub);
            }
          }
        }
      } catch {
        // If URL parsing fails, proceed
      }
      continue;
    }

    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      validUpstreams.push(trimmed);
    }
  }

  const finalUpstreams =
    validUpstreams.length > 0 ? validUpstreams : Array.from(DEFAULT_RELAYS);
  const separator = cleanBase.includes('?') ? '&' : '?';
  return `${cleanBase}${separator}relays=${finalUpstreams.join(',')}`;
}

/**
 * Resolves the effective relay list for read operations.
 * When cache relay is active, collapses multiple upstream relays into a single aggregated cache relay URL.
 *
 * @param relays Target relays (defaults to DEFAULT_RELAYS)
 * @param useCache Whether to route through cache relay (defaults to USE_CACHE_RELAY)
 * @returns Array containing either the single aggregated cache relay URL or raw relay URLs
 */
export function resolveReadRelays(
  relays?: readonly string[],
  useCache: boolean = USE_CACHE_RELAY,
): string[] {
  const targetRelays = relays && relays.length > 0 ? relays : DEFAULT_RELAYS;

  if (useCache && CACHE_RELAY_URL) {
    return [getCacheRelayUrl(targetRelays, CACHE_RELAY_URL)];
  }

  return Array.from(targetRelays);
}

/**
 * Supported Nostr Event Kinds for photo.emre.xyz
 */
export const NOSTR_KINDS = {
  /** Kind 0: Metadata / Organization Profile (NIP-01) */
  METADATA: 0,
  /** Kind 31922: NIP-52 Date-based Calendar Event */
  CALENDAR_EVENT_DATE: 31922,
  /** Kind 31922: Backward-compatible alias for Event Album */
  EVENT_ALBUM: 31922,
  /** Kind 31923: NIP-52 Time-based Calendar Event */
  CALENDAR_EVENT_TIME: 31923,
  /** Kind 31924: NIP-52 Calendar List (Monthly Federated Curation) */
  CALENDAR_LIST: 31924,
  /** Kind 1063: NIP-94 File Metadata (Photos) */
  PHOTO_METADATA: 1063,
  /** Kind 24242: Blossom BUD-11 Authorization */
  BLOSSOM_AUTH: 24242,
  /** Kind 10063: Blossom BUD-04 User Server List */
  BLOSSOM_SERVER_LIST: 10063,
  /** Kind 27235: NIP-98 Generic HTTP Authorization */
  NIP98_AUTH: 27235,
  /** Kind 9735: NIP-57 Zap Receipt */
  ZAP_RECEIPT: 9735,
} as const;

/**
 * Network timeout thresholds (milliseconds)
 */
export const RELAY_TIMEOUTS = {
  /** Maximum duration to wait for a standard multi-relay query before resolving */
  QUERY: 5000,
  /** Fast-first attempt timeout for the primary anchor relay */
  PRIMARY_RACE: 3000,
  /** Maximum duration to wait for publishing acknowledgement */
  PUBLISH: 7000,
} as const;

/**
 * Default administrator public key (hex format).
 * Bypasses payment requirements and grants administrative privileges.
 */
export const DEFAULT_ADMIN_PUBKEY =
  '46f3c7bb33cc3019049b76dc89dbb96e34c247bdda68b6ad8632682793ff8a1a';

/**
 * Resolved administrator public key from environment or default.
 */
export const ADMIN_PUBKEY =
  (typeof process !== 'undefined' && process.env?.PUBLIC_ADMIN_PUBKEY) ||
  (typeof import.meta !== 'undefined' &&
    (import.meta as { env?: Record<string, string> }).env
      ?.PUBLIC_ADMIN_PUBKEY) ||
  DEFAULT_ADMIN_PUBKEY;

/**
 * Maximum acceptable clock drift in seconds for admin challenge-response signatures (2 minutes)
 */
export const ADMIN_CHALLENGE_TIMEOUT_SECONDS = 120;

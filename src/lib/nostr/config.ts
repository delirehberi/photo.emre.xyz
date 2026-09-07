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
 */
export const GLOBAL_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://nos.lol',
] as const;

/**
 * Standard ordered relay list prioritizing the primary anchor relay.
 */
export const DEFAULT_RELAYS: readonly string[] = [
  PRIMARY_RELAY,
  ...GLOBAL_RELAYS,
];

/**
 * Supported Nostr Event Kinds for photo.emre.xyz
 */
export const NOSTR_KINDS = {
  /** Kind 0: Metadata / Organization Profile (NIP-01) */
  METADATA: 0,
  /** Kind 31922: NIP-52 Time-based Calendar Event Album */
  EVENT_ALBUM: 31922,
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

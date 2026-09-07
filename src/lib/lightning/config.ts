/**
 * Lightning Monetization Configuration
 * photo.emre.xyz
 */

/**
 * Fee structure in satoshis for monetized platform actions.
 */
export const LIGHTNING_FEES = {
  /** Organization profile creation on relay mesh (Kind 0) */
  CREATE_ORGANIZATION: 100,
  /** Event album creation (Kind 31922) */
  CREATE_ALBUM: 100,
  /** Photo item upload & metadata registration (Kind 1063) */
  UPLOAD_IMAGE_PER_ITEM: 21,
} as const;

/**
 * Default fallback Lightning Address (LUD-16) receiving platform service fees.
 */
export const DEFAULT_PLATFORM_LUD16 = 'delirehberi@emre.xyz';

/**
 * Resolved platform Lightning Address from environment or default.
 */
export const PLATFORM_LUD16 =
  (typeof process !== 'undefined' && process.env?.PUBLIC_PLATFORM_LUD16) ||
  (typeof import.meta !== 'undefined' &&
    (import.meta as { env?: Record<string, string> }).env
      ?.PUBLIC_PLATFORM_LUD16) ||
  DEFAULT_PLATFORM_LUD16;

/**
 * Test mode flag.
 * When true, platform actions (album creation, photo uploads) are free (0 sats) for all users.
 * When set to false in production deployment (PUBLIC_TEST_MODE=false), standard fees apply to non-admins.
 */
export const IS_TEST_MODE =
  typeof process !== 'undefined' && process.env?.PUBLIC_TEST_MODE === 'false'
    ? false
    : typeof import.meta !== 'undefined' &&
        (import.meta as { env?: Record<string, string> }).env
          ?.PUBLIC_TEST_MODE === 'false'
      ? false
      : true;

/**
 * Local storage key for storing user-configured NIP-47 (NWC) connection strings.
 */
export const NWC_STORAGE_KEY = 'photo_emre_xyz_nwc_connection';

/**
 * Timeout configurations (milliseconds)
 */
export const LIGHTNING_TIMEOUTS = {
  /** Time to wait for user to pay invoice via QR or manual wallet */
  INVOICE_POLL_MS: 120_000,
  /** Time to wait for NWC wallet relay response */
  NWC_REQUEST_MS: 30_000,
  /** Time to wait for WebLN prompt response */
  WEBLN_PROMPT_MS: 45_000,
} as const;

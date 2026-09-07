/**
 * Blossom Protocol & Server Configuration
 * photo.emre.xyz
 */

/**
 * Primary Blossom serverless media backend
 */
export const DEFAULT_BLOSSOM_SERVER = 'https://blossom.primal.net';

/**
 * Maximum allowable upload file size (100 MB)
 */
export const MAX_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024;

/**
 * Allowed MIME types for photo uploads
 */
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

/**
 * Default watermark fallback label when no publisher profile metadata is resolved
 */
export const DEFAULT_WATERMARK_FALLBACK = '@delirehberi';

/**
 * Maximum acceptable clock drift in seconds for NIP-98 authorization events (+/- 60s)
 */
export const NIP98_VALIDITY_WINDOW_SECONDS = 60;

/**
 * Blossom Protocol & NIP-98 Type Definitions
 * photo.emre.xyz
 */

import type { Event as NostrEvent, EventTemplate } from 'nostr-tools/pure';

export type { NostrEvent, EventTemplate };

/**
 * Signer function signature for signing Nostr events (e.g. NIP-07, NIP-46, or raw key)
 */
export type SignerFunction = (
  template: EventTemplate,
) => Promise<NostrEvent> | NostrEvent;

/**
 * Blob descriptor returned by Blossom servers (BUD-01 / BUD-02)
 */
export interface BlobDescriptor {
  /** Public URL to retrieve the blob */
  url: string;
  /** Hexadecimal SHA-256 hash of the content */
  sha256: string;
  /** Size of the blob in bytes */
  size: number;
  /** MIME type of the blob */
  type: string;
  /** Unix timestamp in seconds when the blob was uploaded */
  uploaded: number;
}

/**
 * Progress details during blob upload
 */
export interface UploadProgress {
  /** Number of bytes uploaded so far */
  loaded: number;
  /** Total number of bytes to upload */
  total: number;
  /** Upload percentage (0 to 100) */
  percent: number;
}

/**
 * Callback function for upload progress tracking
 */
export type UploadProgressCallback = (progress: UploadProgress) => void;

/**
 * Options for uploading a blob to Blossom
 */
export interface BlossomUploadOptions {
  /** Function to sign the NIP-98 authorization event */
  signer?: SignerFunction;
  /** Raw private key bytes to sign the NIP-98 authorization event (if signer is not provided) */
  privateKey?: Uint8Array;
  /** MIME type override (defaults to blob.type or image/jpeg) */
  mimeType?: string;
  /** Callback for upload progress updates */
  onProgress?: UploadProgressCallback;
  /** Base Blossom server URL override */
  serverUrl?: string;
}

/**
 * Parameters required to build a NIP-98 HTTP Auth event
 */
export interface Nip98AuthParams {
  /** Target HTTP URL (e.g. "https://media.emre.xyz/upload") */
  url: string;
  /** HTTP Method (e.g. "PUT", "GET", "DELETE") */
  method: string;
  /** Optional SHA-256 payload hash (mandatory for upload requests) */
  sha256?: string;
  /** Optional event description or comment */
  content?: string;
}

/**
 * Parameters required to build a Blossom BUD-11 Authorization Event (Kind 24242)
 */
export interface BlossomAuthParams {
  /** Action verb ('upload' | 'delete' | 'list' | 'get' | 'media') */
  type: 'upload' | 'delete' | 'list' | 'get' | 'media';
  /** Target HTTP URL (e.g. "https://media.emre.xyz/upload") */
  url?: string;
  /** Optional SHA-256 blob hash (for upload / delete) */
  sha256?: string;
  /** Optional server hostname (e.g. "media.emre.xyz") */
  server?: string;
  /** Validity duration in seconds (default: 300 seconds) */
  validitySeconds?: number;
  /** Optional human-readable description */
  content?: string;
}

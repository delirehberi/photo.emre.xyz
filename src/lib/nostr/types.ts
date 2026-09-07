/**
 * Nostr Type Definitions & Domain Models
 * photo.emre.xyz
 */

import type { Event as NostrEvent, EventTemplate } from 'nostr-tools/pure';

export type { NostrEvent, EventTemplate };

/**
 * Parsed Organization Profile (NIP-01 Kind 0)
 */
export interface OrganizationProfile {
  pubkey: string;
  name: string;
  displayName: string;
  about: string;
  picture: string;
  banner?: string;
  nip05?: string;
  lud16?: string;
  lud06?: string;
  website?: string;
  createdAt: number;
}

/**
 * Parsed Event Album (NIP-52 Kind 31922 Time-based Calendar Event Album)
 */
export interface EventAlbum {
  id: string;
  pubkey: string;
  /** Unique parameterized identifier (d tag) */
  dTag: string;
  /** Primary title of the album / event */
  title: string;
  /** Short summary / subtitle */
  summary: string;
  /** Long-form description */
  description?: string;
  /** URL to cover photo */
  coverImage?: string;
  /** Start time as Unix timestamp in seconds */
  startDate?: number;
  /** End time as Unix timestamp in seconds */
  endDate?: number;
  /** Physical or virtual location */
  location?: string;
  /** Topic / category tags (t tags) */
  tags: string[];
  /** Canonical coordinate: 31922:<pubkey>:<dTag> */
  coordinate: string;
  createdAt: number;
}

/**
 * Dimensions extracted from NIP-94 dim tag with aspect ratio
 */
export interface PhotoDimensions {
  width: number;
  height: number;
  /** Computed as width / height, used for zero-CLS CSS aspect-ratio */
  aspectRatio: number;
}

/**
 * Photographic technical EXIF metadata
 */
export interface PhotoExif {
  make?: string;
  model?: string;
  lens?: string;
  iso?: string | number;
  aperture?: string;
  shutterSpeed?: string;
  focalLength?: string;
  dateTimeOriginal?: string;
}

/**
 * Parsed Photo Item (NIP-94 Kind 1063 File Metadata)
 */
export interface PhotoMetadata {
  id: string;
  pubkey: string;
  /** Direct URL to content-addressed media (Blossom) */
  url: string;
  /** SHA-256 content hash (x tag) */
  sha256: string;
  /** MIME type (m tag, e.g. image/jpeg) */
  mimeType: string;
  /** Dimensions and computed aspect ratio */
  dimensions: PhotoDimensions;
  /** Event Album coordinate pointer (a tag): 31922:<pubkey>:<dTag> */
  albumCoordinate: string;
  /** Optional BlurHash placeholder */
  blurhash?: string;
  /** Optional accessibility alt text */
  alt?: string;
  /** Optional caption or summary */
  summary?: string;
  /** Optional technical EXIF metadata */
  exif?: PhotoExif;
  createdAt: number;
}

/**
 * Partitioned photo collection for an Event Album
 */
export interface PhotoPartition {
  /** Photos authored by the event album organizer (pubkey matches album.pubkey) */
  official: PhotoMetadata[];
  /** Photos submitted by community attendees (pubkey does not match album.pubkey) */
  community: PhotoMetadata[];
}

/**
 * Filter options for querying the relay mesh
 */
export interface QueryOptions {
  /** Timeout in milliseconds before resolving available events (defaults to RELAY_TIMEOUTS.QUERY) */
  timeoutMs?: number;
  /** Validate event signatures using verifyEvent (defaults to true) */
  verifySignatures?: boolean;
}

/**
 * Official vs. Community Photo Partitioning
 * photo.emre.xyz
 */

import { sanitizePubkey } from './sanitizer';
import type { PhotoMetadata, PhotoPartition } from './types';

export interface PartitionOptions {
  /** Sort order for each partition: 'desc' (newest first, default) or 'asc' (oldest first) */
  sortOrder?: 'asc' | 'desc';
  /** Deduplicate photos by SHA-256 hash (defaults to true) */
  deduplicateByHash?: boolean;
}

/**
 * Partitions photos for an Event Album into Official Gallery and Community Uploads.
 *
 * Official Gallery:
 * - Authored directly by the Event Album organizer (`photo.pubkey === organizerPubkey`).
 *
 * Community Uploads:
 * - Authored by attendees/contributors (`photo.pubkey !== organizerPubkey`) referencing the album coordinate.
 */
export function partitionPhotos(
  photos: readonly PhotoMetadata[],
  organizerPubkey: string,
  options: PartitionOptions = {},
): PhotoPartition {
  const cleanOrganizer = sanitizePubkey(organizerPubkey);
  if (!cleanOrganizer) {
    throw new Error(
      `Invalid organizer pubkey for partition: ${organizerPubkey}`,
    );
  }

  const { sortOrder = 'desc', deduplicateByHash = true } = options;

  const official: PhotoMetadata[] = [];
  const community: PhotoMetadata[] = [];

  // Track seen SHA-256 hashes to prevent duplicate photo entries
  const seenOfficialHashes = new Set<string>();
  const seenCommunityHashes = new Set<string>();

  for (const photo of photos) {
    const isOfficial = photo.pubkey.toLowerCase() === cleanOrganizer;

    if (isOfficial) {
      if (deduplicateByHash) {
        if (seenOfficialHashes.has(photo.sha256)) continue;
        seenOfficialHashes.add(photo.sha256);
      }
      official.push(photo);
    } else {
      if (deduplicateByHash) {
        if (seenCommunityHashes.has(photo.sha256)) continue;
        seenCommunityHashes.add(photo.sha256);
      }
      community.push(photo);
    }
  }

  const sortMultiplier = sortOrder === 'asc' ? 1 : -1;
  const comparator = (a: PhotoMetadata, b: PhotoMetadata) =>
    (a.createdAt - b.createdAt) * sortMultiplier;

  official.sort(comparator);
  community.sort(comparator);

  return {
    official,
    community,
  };
}

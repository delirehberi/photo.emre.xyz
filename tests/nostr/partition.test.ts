import { describe, it, expect } from 'vitest';
import { partitionPhotos } from '../../src/lib/nostr/partition';
import type { PhotoMetadata } from '../../src/lib/nostr/types';

const ORGANIZER_PUBKEY =
  '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245';
const ATTENDEE_PUBKEY =
  '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';

function createMockPhoto(
  overrides: Partial<PhotoMetadata> = {},
): PhotoMetadata {
  return {
    id: `photo-${Math.random().toString(36).substring(7)}`,
    pubkey: ORGANIZER_PUBKEY,
    url: 'https://media.emre.xyz/photo.jpg',
    sha256: `hash-${Math.random().toString(36).substring(7)}`,
    mimeType: 'image/jpeg',
    dimensions: { width: 1920, height: 1080, aspectRatio: 1.7778 },
    albumCoordinate: `31922:${ORGANIZER_PUBKEY}:berlin-2026`,
    createdAt: 1700000000,
    ...overrides,
  };
}

describe('Photo Partitioning', () => {
  it('correctly partitions official vs community photos', () => {
    const p1 = createMockPhoto({
      pubkey: ORGANIZER_PUBKEY,
      sha256: 'hash-1',
      createdAt: 100,
    });
    const p2 = createMockPhoto({
      pubkey: ATTENDEE_PUBKEY,
      sha256: 'hash-2',
      createdAt: 200,
    });
    const p3 = createMockPhoto({
      pubkey: ORGANIZER_PUBKEY,
      sha256: 'hash-3',
      createdAt: 300,
    });

    const result = partitionPhotos([p1, p2, p3], ORGANIZER_PUBKEY);

    expect(result.official).toHaveLength(2);
    expect(result.community).toHaveLength(1);
    expect(result.official.map((p) => p.sha256)).toEqual(['hash-3', 'hash-1']); // default desc
    expect(result.community[0]?.sha256).toBe('hash-2');
  });

  it('deduplicates photos by sha256 hash', () => {
    const p1 = createMockPhoto({
      pubkey: ORGANIZER_PUBKEY,
      sha256: 'same-hash',
      createdAt: 100,
    });
    const p2 = createMockPhoto({
      pubkey: ORGANIZER_PUBKEY,
      sha256: 'same-hash',
      createdAt: 200,
    });

    const result = partitionPhotos([p1, p2], ORGANIZER_PUBKEY);
    expect(result.official).toHaveLength(1);
  });

  it('supports ascending sort order', () => {
    const p1 = createMockPhoto({
      pubkey: ORGANIZER_PUBKEY,
      createdAt: 100,
      sha256: 'h1',
    });
    const p2 = createMockPhoto({
      pubkey: ORGANIZER_PUBKEY,
      createdAt: 200,
      sha256: 'h2',
    });

    const result = partitionPhotos([p1, p2], ORGANIZER_PUBKEY, {
      sortOrder: 'asc',
    });
    expect(result.official.map((p) => p.createdAt)).toEqual([100, 200]);
  });

  it('correctly partitions mixed Kind 1063 and Kind 20 photo items', () => {
    const p1 = createMockPhoto({
      pubkey: ORGANIZER_PUBKEY,
      sha256: 'hash-official-1063',
      kind: 1063,
      createdAt: 100,
    });
    const p2 = createMockPhoto({
      pubkey: ATTENDEE_PUBKEY,
      sha256: 'hash-comm-nip68-1',
      kind: 20,
      eventId: 'event-nip68',
      itemIndex: 0,
      createdAt: 200,
    });
    const p3 = createMockPhoto({
      pubkey: ATTENDEE_PUBKEY,
      sha256: 'hash-comm-nip68-2',
      kind: 20,
      eventId: 'event-nip68',
      itemIndex: 1,
      createdAt: 200,
    });

    const result = partitionPhotos([p1, p2, p3], ORGANIZER_PUBKEY);
    expect(result.official).toHaveLength(1);
    expect(result.community).toHaveLength(2);
    expect(result.official[0].kind).toBe(1063);
    expect(result.community[0].kind).toBe(20);
    expect(result.community[1].kind).toBe(20);
  });

  it('throws for invalid organizer pubkey', () => {
    expect(() => partitionPhotos([], 'bad-key')).toThrow();
  });
});

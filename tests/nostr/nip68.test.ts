import { describe, it, expect } from 'vitest';
import {
  parseImetaTag,
  serializeImetaTag,
  parsePictureEvent,
  createPictureEventTemplate,
  extractPhotosFromEvent,
} from '../../src/lib/nostr/schemas/photo';
import { NOSTR_KINDS } from '../../src/lib/nostr/config';
import type { NostrEvent } from '../../src/lib/nostr/types';

const TEST_PUBKEY =
  '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245';
const TEST_SHA256_1 =
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const TEST_SHA256_2 =
  'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
const TEST_SHA256_3 =
  'cb8379ac2098aa165029e3938a51da0bcecfc008fd6795f401178647f96c5b34';
const ALBUM_COORD = `31922:${TEST_PUBKEY}:nostr-asia-2026`;

describe('NIP-68 (Kind 20 Picture Events) & NIP-92 (imeta)', () => {
  describe('serializeImetaTag & parseImetaTag', () => {
    it('serializes and parses a full NIP-92 imeta tag', () => {
      const imetaItem = {
        url: 'https://blossom.primal.net/image1.jpg',
        sha256: TEST_SHA256_1,
        dimensions: { width: 3840, height: 2160 },
        mimeType: 'image/jpeg',
        blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4',
        alt: 'Opening keynote hall',
        summary: 'Attendees during the opening speech',
        fallbackUrls: ['https://cdn.nostr.build/image1.jpg'],
        exif: {
          make: 'Sony',
          model: 'A7 IV',
          lens: '24-70mm GM II',
          iso: '200',
          aperture: 'f/2.8',
          shutterSpeed: '1/250s',
          focalLength: '35mm',
          dateTimeOriginal: '2026:09:17 10:00:00',
        },
      };

      const tag = serializeImetaTag(imetaItem);
      expect(tag[0]).toBe('imeta');
      expect(tag).toContain('url https://blossom.primal.net/image1.jpg');
      expect(tag).toContain(`x ${TEST_SHA256_1}`);
      expect(tag).toContain('dim 3840x2160');
      expect(tag).toContain('m image/jpeg');
      expect(tag).toContain('blurhash L6PZfSi_.AyE_3t7t7R**0o#DgR4');
      expect(tag).toContain('alt Opening keynote hall');
      expect(tag).toContain('fallback https://cdn.nostr.build/image1.jpg');
      expect(tag).toContain('make Sony');
      expect(tag).toContain('model A7 IV');

      const parsed = parseImetaTag(tag);
      expect(parsed.url).toBe('https://blossom.primal.net/image1.jpg');
      expect(parsed.sha256).toBe(TEST_SHA256_1);
      expect(parsed.dimensions).toEqual({ width: 3840, height: 2160 });
      expect(parsed.mimeType).toBe('image/jpeg');
      expect(parsed.blurhash).toBe('L6PZfSi_.AyE_3t7t7R**0o#DgR4');
      expect(parsed.alt).toBe('Opening keynote hall');
      expect(parsed.fallbackUrls).toEqual([
        'https://cdn.nostr.build/image1.jpg',
      ]);
      expect(parsed.exif?.make).toBe('Sony');
      expect(parsed.exif?.model).toBe('A7 IV');
      expect(parsed.exif?.iso).toBe('200');
    });

    it('throws error when serializing invalid imeta items', () => {
      expect(() =>
        serializeImetaTag({
          url: '',
          sha256: TEST_SHA256_1,
          dimensions: { width: 100, height: 100 },
        }),
      ).toThrow();

      expect(() =>
        serializeImetaTag({
          url: 'https://example.com/a.jpg',
          sha256: 'invalid',
          dimensions: { width: 100, height: 100 },
        }),
      ).toThrow();
    });

    it('throws error when parsing invalid imeta tag arrays', () => {
      expect(() =>
        parseImetaTag(['not-imeta', 'url https://foo.com']),
      ).toThrow();
      expect(() => parseImetaTag(['imeta', 'dim 100x100'])).toThrow();
    });
  });

  describe('createPictureEventTemplate & parsePictureEvent', () => {
    it('creates a valid Kind 20 Nostr Event Template with multiple imeta tags', () => {
      const template = createPictureEventTemplate({
        albumCoordinate: ALBUM_COORD,
        title: 'Batch from Tokyo Day 1',
        description: 'Captured these moments around the conference venue.',
        tags: ['conference', 'tokyo'],
        items: [
          {
            url: 'https://blossom.emre.xyz/img1.jpg',
            sha256: TEST_SHA256_1,
            dimensions: { width: 1920, height: 1080 },
            alt: 'Photo 1',
          },
          {
            url: 'https://blossom.emre.xyz/img2.jpg',
            sha256: TEST_SHA256_2,
            dimensions: { width: 2400, height: 1600 },
            alt: 'Photo 2',
          },
          {
            url: 'https://blossom.emre.xyz/img3.jpg',
            sha256: TEST_SHA256_3,
            dimensions: { width: 1080, height: 1080 },
            alt: 'Photo 3',
          },
        ],
      });

      expect(template.kind).toBe(NOSTR_KINDS.PICTURE_EVENT);
      expect(template.kind).toBe(20);
      expect(template.tags).toContainEqual(['a', ALBUM_COORD]);
      expect(template.tags).toContainEqual(['title', 'Batch from Tokyo Day 1']);
      expect(template.tags).toContainEqual(['t', 'conference']);
      expect(template.tags).toContainEqual(['t', 'tokyo']);

      const imetaTags = template.tags.filter(
        (t) => Array.isArray(t) && t[0] === 'imeta',
      );
      expect(imetaTags.length).toBe(3);
      expect(template.content).toBe(
        'Captured these moments around the conference venue.',
      );
    });

    it('unpacks a Kind 20 event into individual PhotoMetadata entities', () => {
      const event: NostrEvent = {
        id: 'picture-event-12345',
        pubkey: TEST_PUBKEY,
        kind: 20,
        created_at: 1750000000,
        tags: [
          ['a', ALBUM_COORD],
          ['title', 'Community Snapshots'],
          [
            'imeta',
            'url https://blossom.emre.xyz/photo1.jpg',
            `x ${TEST_SHA256_1}`,
            'dim 1920x1080',
            'm image/jpeg',
            'blurhash L6PZfSi_.AyE_3t7t7R**0o#DgR4',
            'alt Main Stage',
          ],
          [
            'imeta',
            'url https://blossom.emre.xyz/photo2.jpg',
            `x ${TEST_SHA256_2}`,
            'dim 3000x2000',
            'm image/jpeg',
            'alt Hacker Lounge',
          ],
        ],
        content: 'Awesome meetup!',
        sig: 'sig',
      };

      const photos = parsePictureEvent(event);
      expect(photos.length).toBe(2);

      expect(photos[0].id).toBe('picture-event-12345:0');
      expect(photos[0].eventId).toBe('picture-event-12345');
      expect(photos[0].itemIndex).toBe(0);
      expect(photos[0].kind).toBe(20);
      expect(photos[0].pubkey).toBe(TEST_PUBKEY);
      expect(photos[0].url).toBe('https://blossom.emre.xyz/photo1.jpg');
      expect(photos[0].sha256).toBe(TEST_SHA256_1);
      expect(photos[0].dimensions).toEqual({
        width: 1920,
        height: 1080,
        aspectRatio: 1.7778,
      });
      expect(photos[0].albumCoordinate).toBe(ALBUM_COORD);
      expect(photos[0].blurhash).toBe('L6PZfSi_.AyE_3t7t7R**0o#DgR4');
      expect(photos[0].alt).toBe('Main Stage');

      expect(photos[1].id).toBe('picture-event-12345:1');
      expect(photos[1].eventId).toBe('picture-event-12345');
      expect(photos[1].itemIndex).toBe(1);
      expect(photos[1].kind).toBe(20);
      expect(photos[1].url).toBe('https://blossom.emre.xyz/photo2.jpg');
      expect(photos[1].sha256).toBe(TEST_SHA256_2);
      expect(photos[1].dimensions.aspectRatio).toBe(1.5);
    });
  });

  describe('extractPhotosFromEvent unified handler', () => {
    it('handles both Kind 1063 and Kind 20 events uniformly', () => {
      const event1063: NostrEvent = {
        id: 'legacy-1063',
        pubkey: TEST_PUBKEY,
        kind: 1063,
        created_at: 1700000000,
        tags: [
          ['url', 'https://media.emre.xyz/single.jpg'],
          ['x', TEST_SHA256_1],
          ['m', 'image/jpeg'],
          ['dim', '1920x1080'],
          ['a', ALBUM_COORD],
        ],
        content: 'Single image post',
        sig: 'sig',
      };

      const extracted1063 = extractPhotosFromEvent(event1063);
      expect(extracted1063.length).toBe(1);
      expect(extracted1063[0].kind).toBe(1063);
      expect(extracted1063[0].url).toBe('https://media.emre.xyz/single.jpg');

      const event20: NostrEvent = {
        id: 'nip68-post',
        pubkey: TEST_PUBKEY,
        kind: 20,
        created_at: 1700000000,
        tags: [
          ['a', ALBUM_COORD],
          [
            'imeta',
            'url https://media.emre.xyz/img1.jpg',
            `x ${TEST_SHA256_1}`,
            'dim 1920x1080',
            'm image/jpeg',
          ],
          [
            'imeta',
            'url https://media.emre.xyz/img2.jpg',
            `x ${TEST_SHA256_2}`,
            'dim 1080x1080',
            'm image/jpeg',
          ],
        ],
        content: 'Batch post',
        sig: 'sig',
      };

      const extracted20 = extractPhotosFromEvent(event20);
      expect(extracted20.length).toBe(2);
      expect(extracted20[0].kind).toBe(20);
      expect(extracted20[1].kind).toBe(20);
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  parseProfileEvent,
  createProfileEventTemplate,
} from '../../src/lib/nostr/schemas/profile';
import {
  formatAlbumCoordinate,
  parseAlbumCoordinate,
  parseEventAlbum,
  createEventAlbumTemplate,
} from '../../src/lib/nostr/schemas/album';
import {
  parsePhotoDimensions,
  parsePhotoEvent,
  createPhotoEventTemplate,
} from '../../src/lib/nostr/schemas/photo';
import type { NostrEvent } from '../../src/lib/nostr/types';

const TEST_PUBKEY =
  '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245';
const TEST_SHA256 =
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

describe('Nostr Event Schemas', () => {
  describe('Kind 0: Profile Metadata', () => {
    it('parses valid Kind 0 event successfully', () => {
      const event: NostrEvent = {
        id: 'event-0',
        pubkey: TEST_PUBKEY,
        kind: 0,
        created_at: 1700000000,
        tags: [],
        content: JSON.stringify({
          name: 'emre',
          display_name: 'Emre Yilmaz',
          about: 'Photographer & Engineer',
          picture: 'https://media.emre.xyz/avatar.jpg',
          nip05: 'emre@emre.xyz',
          lud16: 'emre@getalby.com',
          website: 'https://photo.emre.xyz',
        }),
        sig: 'sig',
      };

      const parsed = parseProfileEvent(event);
      expect(parsed.pubkey).toBe(TEST_PUBKEY);
      expect(parsed.name).toBe('emre');
      expect(parsed.displayName).toBe('Emre Yilmaz');
      expect(parsed.about).toBe('Photographer & Engineer');
      expect(parsed.picture).toBe('https://media.emre.xyz/avatar.jpg');
      expect(parsed.nip05).toBe('emre@emre.xyz');
      expect(parsed.lud16).toBe('emre@getalby.com');
      expect(parsed.website).toBe('https://photo.emre.xyz/');
    });

    it('sanitizes script injections in profile', () => {
      const event: NostrEvent = {
        id: 'event-0-xss',
        pubkey: TEST_PUBKEY,
        kind: 0,
        created_at: 1700000000,
        tags: [],
        content: JSON.stringify({
          name: '<script>alert("xss")</script>Emre',
          picture: 'javascript:alert(1)',
          about: '<b>Bold</b> intro',
        }),
        sig: 'sig',
      };

      const parsed = parseProfileEvent(event);
      expect(parsed.name).toBe('alert("xss")Emre');
      expect(parsed.picture).toBe(''); // javascript: URL discarded
      expect(parsed.about).toBe('Bold intro');
    });

    it('parses lud06 and lnurl format in profile event', () => {
      const event: NostrEvent = {
        id: 'event-0-lud06',
        pubkey: TEST_PUBKEY,
        kind: 0,
        created_at: 1700000000,
        tags: [],
        content: JSON.stringify({
          name: 'cosplayclub',
          lud06:
            'lnurl1dp68gurn8ghj7ampd3kx2ar0veekzar0wd5xjtnrdakj7tnhv4kxctnv9exz7mrww4excttvdankjm3vd3hxkmn5wshxxmmd9akxuatjdsh8g6tvd3hxj6r0depx2mn5vsmk2mmyvf5xgetv8amk2vmyv5urvdr9v3jr2d3ev93x2d3j9a6k2e3nxu6rve3ev4ex2d3j9a6k2e3nxu6rve3ev4ex2d3ev4ex2d3ev4ex2d3ev4ex2d3ev4ex2d3ev4ex2d3ev4ex2d3ev4ex2d3ev4ex2',
        }),
        sig: 'sig',
      };

      const parsed = parseProfileEvent(event);
      expect(parsed.lud06).toContain('lnurl1');

      const template = createProfileEventTemplate({
        name: 'cosplayclub',
        lud06: parsed.lud06,
      });
      const parsedTemplate = JSON.parse(template.content);
      expect(parsedTemplate.lud06).toBe(parsed.lud06);
    });

    it('creates valid profile template', () => {
      const template = createProfileEventTemplate({
        name: 'emre',
        displayName: 'Emre',
        about: 'Photography',
        picture: 'https://media.emre.xyz/pic.jpg',
      });

      expect(template.kind).toBe(0);
      const parsed = JSON.parse(template.content);
      expect(parsed.name).toBe('emre');
      expect(parsed.picture).toBe('https://media.emre.xyz/pic.jpg');
    });
  });

  describe('Kind 31922: Event Album', () => {
    it('formats and parses coordinates accurately', () => {
      const coord = formatAlbumCoordinate(TEST_PUBKEY, 'berlin-2026');
      expect(coord).toBe(`31922:${TEST_PUBKEY}:berlin-2026`);

      const parsed = parseAlbumCoordinate(coord);
      expect(parsed.kind).toBe(31922);
      expect(parsed.pubkey).toBe(TEST_PUBKEY);
      expect(parsed.dTag).toBe('berlin-2026');
    });

    it('parses valid Kind 31922 Event Album event', () => {
      const event: NostrEvent = {
        id: 'event-album-1',
        pubkey: TEST_PUBKEY,
        kind: 31922,
        created_at: 1700000000,
        tags: [
          ['d', 'berlin-hackathon'],
          ['title', 'Berlin Hackathon 2026'],
          ['summary', 'Photos from Berlin'],
          ['image', 'https://media.emre.xyz/cover.jpg'],
          ['start', '1710000000'],
          ['end', '1710100000'],
          ['location', 'Berlin, Germany'],
          ['t', 'nostr'],
          ['t', 'hackathon'],
        ],
        content: 'Long description of event',
        sig: 'sig',
      };

      const album = parseEventAlbum(event);
      expect(album.id).toBe('event-album-1');
      expect(album.pubkey).toBe(TEST_PUBKEY);
      expect(album.dTag).toBe('berlin-hackathon');
      expect(album.title).toBe('Berlin Hackathon 2026');
      expect(album.summary).toBe('Photos from Berlin');
      expect(album.coverImage).toBe('https://media.emre.xyz/cover.jpg');
      expect(album.startDate).toBe(1710000000);
      expect(album.endDate).toBe(1710100000);
      expect(album.location).toBe('Berlin, Germany');
      expect(album.tags).toEqual(['nostr', 'hackathon']);
      expect(album.coordinate).toBe(`31922:${TEST_PUBKEY}:berlin-hackathon`);
    });

    it('parses valid Kind 31923 Time-based event successfully', () => {
      const event: NostrEvent = {
        id: 'event-album-31923',
        pubkey: TEST_PUBKEY,
        kind: 31923,
        created_at: 1789397270,
        tags: [
          ['d', 'booking-1789397270312-zks09gx'],
          ['title', 'Special Speaking Club Meetup'],
          ['summary', 'Cosplay and English speaking'],
          ['start', '1789399000'],
          ['end', '1789406200'],
          ['location', 'Kadikoy, Istanbul'],
          ['t', 'speaking-club'],
        ],
        content: 'Event details here',
        sig: 'sig',
      };

      const album = parseEventAlbum(event);
      expect(album.id).toBe('event-album-31923');
      expect(album.kind).toBe(31923);
      expect(album.dTag).toBe('booking-1789397270312-zks09gx');
      expect(album.title).toBe('Special Speaking Club Meetup');
      expect(album.coordinate).toBe(
        `31923:${TEST_PUBKEY}:booking-1789397270312-zks09gx`,
      );
      expect(album.location).toBe('Kadikoy, Istanbul');
    });

    it('creates valid Event Album template with source reference', () => {
      const template = createEventAlbumTemplate({
        dTag: 'summer-camp',
        title: 'Summer Camp',
        summary: 'Outdoor photos',
        coverImage: 'https://media.emre.xyz/camp.jpg',
        startDate: 1715000000,
        tags: ['Nature', 'Summer'],
        sourceCoordinate: '31923:somepubkey:sourcedtag',
      });

      expect(template.kind).toBe(31922);
      expect(template.tags).toContainEqual(['d', 'summer-camp']);
      expect(template.tags).toContainEqual(['title', 'Summer Camp']);
      expect(template.tags).toContainEqual([
        'image',
        'https://media.emre.xyz/camp.jpg',
      ]);
      expect(template.tags).toContainEqual(['t', 'nature']);
      expect(template.tags).toContainEqual([
        'a',
        '31923:somepubkey:sourcedtag',
        '',
        'source',
      ]);
    });
  });

  describe('Kind 1063: Photo Metadata (NIP-94)', () => {
    it('computes aspect ratios correctly with parsePhotoDimensions', () => {
      const landscape = parsePhotoDimensions('1920x1080');
      expect(landscape.width).toBe(1920);
      expect(landscape.height).toBe(1080);
      expect(landscape.aspectRatio).toBeCloseTo(1.7778, 3);

      const portrait = parsePhotoDimensions('1080x1350');
      expect(portrait.aspectRatio).toBeCloseTo(0.8, 3);

      const square = parsePhotoDimensions('800x800');
      expect(square.aspectRatio).toBe(1);
    });

    it('throws error on non-positive or malformed dimensions', () => {
      expect(() => parsePhotoDimensions('invalid')).toThrow();
      expect(() => parsePhotoDimensions('0x100')).toThrow();
      expect(() => parsePhotoDimensions('-100x200')).toThrow();
    });

    it('parses complete Kind 1063 photo event', () => {
      const event: NostrEvent = {
        id: 'photo-1',
        pubkey: TEST_PUBKEY,
        kind: 1063,
        created_at: 1700000000,
        tags: [
          ['url', 'https://media.emre.xyz/photo.jpg'],
          ['x', TEST_SHA256],
          ['m', 'image/jpeg'],
          ['dim', '2400x1600'],
          ['a', `31922:${TEST_PUBKEY}:berlin-2026`],
          ['blurhash', 'L6PZfSi_.AyE_3t7t7R**0o#DgR4'],
          ['alt', 'Speakers on stage'],
          ['summary', 'Keynote address'],
        ],
        content: 'Camera: Sony A7IV',
        sig: 'sig',
      };

      const photo = parsePhotoEvent(event);
      expect(photo.id).toBe('photo-1');
      expect(photo.url).toBe('https://media.emre.xyz/photo.jpg');
      expect(photo.sha256).toBe(TEST_SHA256);
      expect(photo.mimeType).toBe('image/jpeg');
      expect(photo.dimensions.width).toBe(2400);
      expect(photo.dimensions.height).toBe(1600);
      expect(photo.dimensions.aspectRatio).toBe(1.5);
      expect(photo.albumCoordinate).toBe(`31922:${TEST_PUBKEY}:berlin-2026`);
      expect(photo.blurhash).toBe('L6PZfSi_.AyE_3t7t7R**0o#DgR4');
      expect(photo.alt).toBe('Speakers on stage');
      expect(photo.summary).toBe('Keynote address');
    });

    it('throws when mandatory tags are missing', () => {
      const missingDim: NostrEvent = {
        id: 'photo-missing-dim',
        pubkey: TEST_PUBKEY,
        kind: 1063,
        created_at: 1700000000,
        tags: [
          ['url', 'https://media.emre.xyz/photo.jpg'],
          ['x', TEST_SHA256],
          ['m', 'image/jpeg'],
          ['a', `31922:${TEST_PUBKEY}:berlin-2026`],
        ],
        content: '',
        sig: 'sig',
      };

      expect(() => parsePhotoEvent(missingDim)).toThrow('dim');
    });

    it('creates valid photo event template', () => {
      const template = createPhotoEventTemplate({
        url: 'https://media.emre.xyz/shot.jpg',
        sha256: TEST_SHA256,
        dimensions: { width: 3840, height: 2160 },
        albumCoordinate: `31922:${TEST_PUBKEY}:berlin-2026`,
        alt: 'Sunset over skyline',
      });

      expect(template.kind).toBe(1063);
      expect(template.tags).toContainEqual([
        'url',
        'https://media.emre.xyz/shot.jpg',
      ]);
      expect(template.tags).toContainEqual(['x', TEST_SHA256]);
      expect(template.tags).toContainEqual(['dim', '3840x2160']);
      expect(template.tags).toContainEqual([
        'a',
        `31922:${TEST_PUBKEY}:berlin-2026`,
      ]);
      expect(template.tags).toContainEqual(['alt', 'Sunset over skyline']);
    });

    it('parses and creates photo events with technical EXIF metadata', () => {
      const event: NostrEvent = {
        id: 'photo-exif-1',
        pubkey: TEST_PUBKEY,
        kind: 1063,
        created_at: 1700000000,
        tags: [
          ['url', 'https://media.emre.xyz/exif-photo.jpg'],
          ['x', TEST_SHA256],
          ['m', 'image/jpeg'],
          ['dim', '6000x4000'],
          ['a', `31922:${TEST_PUBKEY}:berlin-2026`],
          ['make', 'Sony'],
          ['model', 'ILCE-7M4'],
          ['lens', 'FE 24-70mm F2.8 GM II'],
          ['iso', '100'],
          ['f', 'f/2.8'],
          ['exp', '1/500s'],
          ['focal', '35mm'],
          ['datetimeoriginal', '2026:09:06 14:30:00'],
        ],
        content: 'Portrait shot',
        sig: 'sig',
      };

      const photo = parsePhotoEvent(event);
      expect(photo.exif).toBeDefined();
      expect(photo.exif?.make).toBe('Sony');
      expect(photo.exif?.model).toBe('ILCE-7M4');
      expect(photo.exif?.lens).toBe('FE 24-70mm F2.8 GM II');
      expect(photo.exif?.iso).toBe('100');
      expect(photo.exif?.aperture).toBe('f/2.8');
      expect(photo.exif?.shutterSpeed).toBe('1/500s');
      expect(photo.exif?.focalLength).toBe('35mm');
      expect(photo.exif?.dateTimeOriginal).toBe('2026:09:06 14:30:00');

      const template = createPhotoEventTemplate({
        url: 'https://media.emre.xyz/exif-photo.jpg',
        sha256: TEST_SHA256,
        dimensions: { width: 6000, height: 4000 },
        albumCoordinate: `31922:${TEST_PUBKEY}:berlin-2026`,
        exif: {
          make: 'Sony',
          model: 'ILCE-7M4',
          aperture: 'f/2.8',
          shutterSpeed: '1/500s',
          iso: 100,
        },
      });

      expect(template.tags).toContainEqual(['make', 'Sony']);
      expect(template.tags).toContainEqual(['model', 'ILCE-7M4']);
      expect(template.tags).toContainEqual(['f', 'f/2.8']);
      expect(template.tags).toContainEqual(['exp', '1/500s']);
      expect(template.tags).toContainEqual(['iso', '100']);
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  EventAlbumFormSchema,
  OrganizationFormSchema,
  PhotoUploadSchema,
} from '../../src/lib/nostr/schemas/forms';

describe('Zod Form Validation Schemas', () => {
  describe('EventAlbumFormSchema', () => {
    it('validates a correct event album form', () => {
      const validData = {
        title: 'Istanbul Tech Meetup 2026',
        dTag: 'istanbul-tech-meetup-2026',
        summary:
          'A sovereign gathering of open source contributors and creators.',
        description: 'Detailed event description and guidelines.',
        location: 'Istanbul, Turkey',
        coverImage:
          'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
        startDateStr: '2026-09-10',
        endDateStr: '2026-09-12',
        tags: 'tech, nostr, istanbul',
      };

      const result = EventAlbumFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects an invalid event slug with uppercase letters or spaces', () => {
      const invalidData = {
        title: 'Istanbul Tech Meetup',
        dTag: 'Istanbul Meetup!',
        summary: 'A great event summary.',
      };

      const result = EventAlbumFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain(
          'küçük harf, rakam ve tire',
        );
      }
    });

    it('rejects a title that is too short', () => {
      const invalidData = {
        title: 'Hi',
        dTag: 'valid-slug',
        summary: 'A great event summary.',
      };

      const result = EventAlbumFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('en az 3 karakter');
      }
    });
  });

  describe('OrganizationFormSchema', () => {
    it('validates a correct organization creation form', () => {
      const validData = {
        name: 'workouse_media',
        displayName: 'Workouse Media & Tech',
        about: 'Open source decentralized media collective.',
        picture: 'https://media.emre.xyz/logo.png',
        website: 'https://workouse.com',
        nip05: 'emre@workouse.com',
        lud16: 'delirehberi@getalby.com',
      };

      const result = OrganizationFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects an invalid NIP-05 identifier', () => {
      const invalidData = {
        name: 'test_org',
        nip05: 'not-an-email-or-nip05',
      };

      const result = OrganizationFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('NIP-05');
      }
    });

    it('rejects an invalid Lightning address', () => {
      const invalidData = {
        name: 'test_org',
        lud16: 'invalid_lightning_address',
      };

      const result = OrganizationFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('Lightning');
      }
    });
  });

  describe('PhotoUploadSchema', () => {
    it('validates correct photo upload metadata', () => {
      const validData = {
        fileName: 'keynote.jpg',
        fileSize: 4 * 1024 * 1024,
        mimeType: 'image/jpeg',
        dimensions: { width: 3840, height: 2160 },
        sha256:
          'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        summary: 'Opening keynote session',
      };

      const result = PhotoUploadSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects non-image MIME types', () => {
      const invalidData = {
        fileName: 'document.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        dimensions: { width: 100, height: 100 },
        sha256:
          'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      };

      const result = PhotoUploadSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain(
          'Sadece resim dosyaları',
        );
      }
    });

    it('rejects invalid sha256 hashes', () => {
      const invalidData = {
        fileName: 'test.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        dimensions: { width: 100, height: 100 },
        sha256: 'not-a-sha256-hash',
      };

      const result = PhotoUploadSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('SHA-256');
      }
    });
  });
});

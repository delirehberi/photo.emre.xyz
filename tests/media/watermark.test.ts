import { describe, it, expect } from 'vitest';
import {
  resolveWatermarkLabel,
  escapeXml,
  createWatermarkBadgeSvg,
  createSvgCompositedFallback,
} from '../../src/lib/media/watermark';
import type { OrganizationProfile } from '../../src/lib/nostr/types';

describe('Watermark Engine', () => {
  describe('resolveWatermarkLabel', () => {
    it('prioritizes nip05 over displayName and name', () => {
      const profile: OrganizationProfile = {
        pubkey: 'npub1...',
        name: 'emre',
        displayName: 'Emre Yılmaz',
        nip05: 'emre@emre.xyz',
        about: '',
        picture: '',
        createdAt: 1000,
      };

      expect(resolveWatermarkLabel(profile)).toBe('emre@emre.xyz');
    });

    it('falls back to displayName when nip05 is absent', () => {
      const profile: OrganizationProfile = {
        pubkey: 'npub1...',
        name: 'emre',
        displayName: 'Emre Yılmaz',
        about: '',
        picture: '',
        createdAt: 1000,
      };

      expect(resolveWatermarkLabel(profile)).toBe('Emre Yılmaz');
    });

    it('falls back to name when displayName and nip05 are absent', () => {
      const profile: OrganizationProfile = {
        pubkey: 'npub1...',
        name: 'delirehberi',
        displayName: '',
        about: '',
        picture: '',
        createdAt: 1000,
      };

      expect(resolveWatermarkLabel(profile)).toBe('delirehberi');
    });

    it('falls back to default @delirehberi when profile is null or empty', () => {
      expect(resolveWatermarkLabel(null)).toBe('@delirehberi');
      expect(resolveWatermarkLabel(undefined)).toBe('@delirehberi');
    });
  });

  describe('escapeXml', () => {
    it('escapes XML special characters safely', () => {
      expect(escapeXml('<script>alert("xss") & \'test\'</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;) &amp; &apos;test&apos;&lt;/script&gt;',
      );
    });
  });

  describe('createWatermarkBadgeSvg', () => {
    it('generates a valid SVG badge with escaped label', () => {
      const svg = createWatermarkBadgeSvg('Alice & Bob');
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg.endsWith('</svg>')).toBe(true);
      expect(svg).toContain('Alice &amp; Bob');
      expect(svg).toContain('<rect');
      expect(svg).toContain('<text');
    });
  });

  describe('createSvgCompositedFallback', () => {
    it('composites image with dimensions and badge', () => {
      const svg = createSvgCompositedFallback({
        imageBase64: 'QUJD',
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        watermarkLabel: 'emre@emre.xyz',
      });

      expect(svg).toContain('viewBox="0 0 1920 1080"');
      expect(svg).toContain('data:image/jpeg;base64,QUJD');
      expect(svg).toContain('emre@emre.xyz');
    });
  });
});

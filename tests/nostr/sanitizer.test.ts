import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  sanitizeText,
  sanitizeUrl,
  sanitizeSha256,
  sanitizePubkey,
  sanitizeCoordinate,
} from '../../src/lib/nostr/sanitizer';

describe('Nostr Sanitizer', () => {
  describe('escapeHtml', () => {
    it('escapes dangerous HTML characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
      );
      expect(escapeHtml("Tom & Jerry's")).toBe('Tom &amp; Jerry&#039;s');
    });
  });

  describe('sanitizeText', () => {
    it('strips HTML tags and trims whitespace', () => {
      const input = '   <b>Hello</b> <script>alert(1)</script>World!   ';
      expect(sanitizeText(input)).toBe('Hello alert(1)World!');
    });

    it('enforces maxLength truncation', () => {
      const long = 'a'.repeat(50);
      expect(sanitizeText(long, 10)).toBe('aaaaaaaaaa');
    });

    it('handles non-string input gracefully', () => {
      expect(sanitizeText(null)).toBe('');
      expect(sanitizeText(undefined)).toBe('');
      expect(sanitizeText(12345)).toBe('');
    });
  });

  describe('sanitizeUrl', () => {
    it('allows valid HTTP and HTTPS URLs', () => {
      expect(sanitizeUrl('https://media.emre.xyz/abcd')).toBe(
        'https://media.emre.xyz/abcd',
      );
      expect(sanitizeUrl('http://example.com/photo.jpg')).toBe(
        'http://example.com/photo.jpg',
      );
    });

    it('blocks dangerous URL schemes', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
      expect(
        sanitizeUrl('data:text/html,<script>alert(1)</script>'),
      ).toBeNull();
      expect(sanitizeUrl('vbscript:msgbox(1)')).toBeNull();
      expect(sanitizeUrl('file:///etc/passwd')).toBeNull();
    });

    it('blocks malformed strings', () => {
      expect(sanitizeUrl('not-a-url')).toBeNull();
      expect(sanitizeUrl('')).toBeNull();
      expect(sanitizeUrl(null)).toBeNull();
    });
  });

  describe('sanitizeSha256', () => {
    it('accepts valid 64-char hex strings', () => {
      const valid =
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      expect(sanitizeSha256(valid)).toBe(valid);
      expect(sanitizeSha256(valid.toUpperCase())).toBe(valid);
    });

    it('rejects invalid hashes', () => {
      expect(sanitizeSha256('short')).toBeNull();
      expect(sanitizeSha256('z'.repeat(64))).toBeNull();
      expect(sanitizeSha256('')).toBeNull();
      expect(sanitizeSha256(null)).toBeNull();
    });
  });

  describe('sanitizePubkey', () => {
    it('accepts valid 64-char hex pubkey', () => {
      const pubkey =
        '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245';
      expect(sanitizePubkey(pubkey)).toBe(pubkey);
    });

    it('rejects invalid pubkey', () => {
      expect(sanitizePubkey('invalid')).toBeNull();
      expect(sanitizePubkey(null)).toBeNull();
    });
  });

  describe('sanitizeCoordinate', () => {
    it('validates standard replaceable event coordinate', () => {
      const pubkey =
        '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245';
      const coord = `31922:${pubkey}:summer-vibes-2026`;
      expect(sanitizeCoordinate(coord)).toBe(coord);
    });

    it('handles d-tags with colons', () => {
      const pubkey =
        '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245';
      const coord = `31922:${pubkey}:event:part:1`;
      expect(sanitizeCoordinate(coord)).toBe(coord);
    });

    it('rejects invalid coordinates', () => {
      expect(sanitizeCoordinate('invalid')).toBeNull();
      expect(sanitizeCoordinate('31922:short:tag')).toBeNull();
      expect(
        sanitizeCoordinate(
          'notnumber:32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245:tag',
        ),
      ).toBeNull();
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  SECURITY_HEADERS,
  normalizePath,
  isCacheableRoute,
} from '../../src/lib/security/headers';

describe('Production HTTP Security Headers & Edge Cache Routing', () => {
  describe('Security Headers', () => {
    it('contains strict HSTS configuration for production', () => {
      expect(SECURITY_HEADERS['Strict-Transport-Security']).toBe(
        'max-age=31536000; includeSubDomains; preload',
      );
    });

    it('contains Cross-Origin-Opener-Policy allowing WebLN/NIP-07 popups', () => {
      expect(SECURITY_HEADERS['Cross-Origin-Opener-Policy']).toBe(
        'same-origin-allow-popups',
      );
    });

    it('denies clickjacking framing attempts via X-Frame-Options and CSP', () => {
      expect(SECURITY_HEADERS['X-Frame-Options']).toBe('DENY');
      expect(SECURITY_HEADERS['Content-Security-Policy']).toContain(
        "frame-ancestors 'none'",
      );
    });

    it('enforces nosniff and strict referrer policy', () => {
      expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff');
      expect(SECURITY_HEADERS['Referrer-Policy']).toBe(
        'strict-origin-when-cross-origin',
      );
    });
  });

  describe('normalizePath', () => {
    it('normalizes English locale routes to root paths', () => {
      expect(normalizePath('/en')).toBe('/');
      expect(normalizePath('/en/')).toBe('/');
      expect(normalizePath('/en/events')).toBe('/events');
      expect(normalizePath('/en/album/berlin')).toBe('/album/berlin');
    });

    it('preserves native Turkish / default paths', () => {
      expect(normalizePath('/')).toBe('/');
      expect(normalizePath('/events')).toBe('/events');
      expect(normalizePath('/album/berlin')).toBe('/album/berlin');
    });
  });

  describe('isCacheableRoute', () => {
    it('allows caching of public informational and media routes', () => {
      expect(isCacheableRoute('/', 'GET')).toBe(true);
      expect(isCacheableRoute('/en', 'GET')).toBe(true);
      expect(isCacheableRoute('/events', 'GET')).toBe(true);
      expect(isCacheableRoute('/en/events', 'GET')).toBe(true);
      expect(isCacheableRoute('/about', 'GET')).toBe(true);
      expect(isCacheableRoute('/contact', 'GET')).toBe(true);
      expect(isCacheableRoute('/album/summit-2026', 'GET')).toBe(true);
      expect(isCacheableRoute('/org/npub1xyz', 'GET')).toBe(true);
      expect(
        isCacheableRoute(
          '/api/download/e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          'GET',
        ),
      ).toBe(true);
    });

    it('strictly forbids caching of admin, mutation, and creation endpoints', () => {
      expect(isCacheableRoute('/admin', 'GET')).toBe(false);
      expect(isCacheableRoute('/en/admin', 'GET')).toBe(false);
      expect(isCacheableRoute('/api/admin/verify', 'GET')).toBe(false);
      expect(isCacheableRoute('/api/cache/invalidate', 'POST')).toBe(false);
      expect(isCacheableRoute('/events/create', 'GET')).toBe(false);
      expect(isCacheableRoute('/en/events/create', 'GET')).toBe(false);
    });

    it('rejects all non-GET methods regardless of path', () => {
      expect(isCacheableRoute('/', 'POST')).toBe(false);
      expect(isCacheableRoute('/album/test', 'DELETE')).toBe(false);
      expect(isCacheableRoute('/events', 'PUT')).toBe(false);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { getLocaleFromUrl, getLocalizedPath } from './context';

describe('i18n URL utilities', () => {
  describe('getLocaleFromUrl', () => {
    it('returns "tr" for root path', () => {
      const url = new URL('https://photo.emre.xyz/');
      expect(getLocaleFromUrl(url)).toBe('tr');
    });

    it('returns "tr" for standard Turkish paths', () => {
      expect(getLocaleFromUrl(new URL('https://photo.emre.xyz/events'))).toBe(
        'tr',
      );
      expect(getLocaleFromUrl(new URL('https://photo.emre.xyz/about'))).toBe(
        'tr',
      );
      expect(
        getLocaleFromUrl(new URL('https://photo.emre.xyz/album/test-album')),
      ).toBe('tr');
    });

    it('returns "en" for /en root path', () => {
      expect(getLocaleFromUrl(new URL('https://photo.emre.xyz/en'))).toBe('en');
      expect(getLocaleFromUrl(new URL('https://photo.emre.xyz/en/'))).toBe(
        'en',
      );
    });

    it('returns "en" for /en nested paths', () => {
      expect(
        getLocaleFromUrl(new URL('https://photo.emre.xyz/en/events')),
      ).toBe('en');
      expect(getLocaleFromUrl(new URL('https://photo.emre.xyz/en/about'))).toBe(
        'en',
      );
      expect(
        getLocaleFromUrl(new URL('https://photo.emre.xyz/en/album/test-album')),
      ).toBe('en');
      expect(
        getLocaleFromUrl(new URL('https://photo.emre.xyz/en/org/npub123')),
      ).toBe('en');
    });
  });

  describe('getLocalizedPath', () => {
    it('correctly builds Turkish paths without /tr prefix', () => {
      expect(getLocalizedPath('/', 'tr')).toBe('/');
      expect(getLocalizedPath('/events', 'tr')).toBe('/events');
      expect(getLocalizedPath('/events/create', 'tr')).toBe('/events/create');
      expect(getLocalizedPath('/album/berlin', 'tr')).toBe('/album/berlin');
    });

    it('strips existing /en prefix when switching to "tr"', () => {
      expect(getLocalizedPath('/en', 'tr')).toBe('/');
      expect(getLocalizedPath('/en/', 'tr')).toBe('/');
      expect(getLocalizedPath('/en/events', 'tr')).toBe('/events');
      expect(getLocalizedPath('/en/about', 'tr')).toBe('/about');
      expect(getLocalizedPath('/en/album/berlin', 'tr')).toBe('/album/berlin');
    });

    it('adds /en prefix when switching to "en"', () => {
      expect(getLocalizedPath('/', 'en')).toBe('/en');
      expect(getLocalizedPath('/events', 'en')).toBe('/en/events');
      expect(getLocalizedPath('/about', 'en')).toBe('/en/about');
      expect(getLocalizedPath('/album/berlin', 'en')).toBe('/en/album/berlin');
    });

    it('keeps single /en prefix if input already had /en', () => {
      expect(getLocalizedPath('/en', 'en')).toBe('/en');
      expect(getLocalizedPath('/en/events', 'en')).toBe('/en/events');
      expect(getLocalizedPath('/en/album/berlin', 'en')).toBe(
        '/en/album/berlin',
      );
    });

    it('handles root or full URLs correctly', () => {
      expect(getLocalizedPath('https://photo.emre.xyz/events', 'en')).toBe(
        '/en/events',
      );
      expect(getLocalizedPath('https://photo.emre.xyz/en/events', 'tr')).toBe(
        '/events',
      );
    });
  });
});

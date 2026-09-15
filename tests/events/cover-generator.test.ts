import { describe, it, expect } from 'vitest';
import {
  hashSeed,
  SeededRNG,
  extractMonogram,
  generateEventCover,
  COVER_PALETTES,
  COVER_PATTERN_TYPES,
} from '../../src/lib/events/cover-generator';

describe('Event Cover Generator - Hash & RNG', () => {
  it('produces deterministic 32-bit hashes for identical inputs', () => {
    const seed1 = '33123:pubkey123:webend-coffee-talk-7';
    const seed2 = '33123:pubkey123:webend-coffee-talk-7';
    expect(hashSeed(seed1)).toBe(hashSeed(seed2));
    expect(typeof hashSeed(seed1)).toBe('number');
    expect(hashSeed(seed1)).toBeGreaterThanOrEqual(0);
  });

  it('produces different hashes for distinct seeds', () => {
    const hashA = hashSeed('event-a');
    const hashB = hashSeed('event-b');
    expect(hashA).not.toBe(hashB);
  });

  it('produces identical pseudo-random sequences for same seed', () => {
    const rng1 = new SeededRNG(42);
    const rng2 = new SeededRNG(42);

    const seq1 = [rng1.next(), rng1.next(), rng1.intRange(1, 100)];
    const seq2 = [rng2.next(), rng2.next(), rng2.intRange(1, 100)];

    expect(seq1).toEqual(seq2);
  });
});

describe('Event Monogram Extraction (extractMonogram)', () => {
  it('extracts initials from multi-word event titles', () => {
    expect(extractMonogram('Webend Coffee Talk - 7')).toBe('WC');
    expect(extractMonogram('Nostr Hackathon 2026')).toBe('NH');
    expect(extractMonogram('Cosplay Photography Meetup')).toBe('CP');
  });

  it('correctly handles Turkish characters in titles', () => {
    expect(extractMonogram('İzmir Fotoğrafçılık Buluşması')).toBe('İF');
    expect(extractMonogram('Şölen Günü')).toBe('ŞG');
    expect(extractMonogram('Özgür Yazılım Etkinliği')).toBe('ÖY');
  });

  it('extracts two characters from single word titles', () => {
    expect(extractMonogram('Cosplay')).toBe('CO');
    expect(extractMonogram('DevFest')).toBe('DE');
  });

  it('falls back to "EV" for empty, null, or symbol-only titles', () => {
    expect(extractMonogram('')).toBe('EV');
    expect(extractMonogram(null)).toBe('EV');
    expect(extractMonogram(undefined)).toBe('EV');
    expect(extractMonogram('--- ??? !!!')).toBe('EV');
  });
});

describe('Deterministic Cover Art Generation (generateEventCover)', () => {
  it('generates completely deterministic cover data for the same event', () => {
    const cover1 = generateEventCover(
      '33123:pubkey1:webend-coffee-talk-7',
      'Webend Coffee Talk - 7',
    );
    const cover2 = generateEventCover(
      '33123:pubkey1:webend-coffee-talk-7',
      'Webend Coffee Talk - 7',
    );

    expect(cover1).toEqual(cover2);
    expect(cover1.monogram).toBe('WC');
    expect(cover1.palette).toBeDefined();
    expect(cover1.patternType).toBeDefined();
    expect(cover1.svgElements.shapes.length).toBeGreaterThan(0);
  });

  it('generates distinct palettes and patterns across different events', () => {
    const events = [
      { seed: 'event-1', title: 'Cosplay Showcase' },
      { seed: 'event-2', title: 'Speaking Club Meetup' },
      { seed: 'event-3', title: 'Bitcoin Builders Hackathon' },
      { seed: 'event-4', title: 'Street Photography Tour' },
    ];

    const results = events.map((e) => generateEventCover(e.seed, e.title));
    const uniquePalettes = new Set(results.map((r) => r.palette.id));

    // Across 4 distinct events, we should have multiple distinct palettes
    expect(uniquePalettes.size).toBeGreaterThan(1);
  });

  it('contains valid SVG attributes for all generated shapes', () => {
    for (const patternType of COVER_PATTERN_TYPES) {
      // Create seed that maps to this pattern type
      const cover = generateEventCover(
        `pattern-test-${patternType}`,
        'Test Event',
      );
      expect(cover.svgElements.shapes.length).toBeGreaterThan(0);

      for (const shape of cover.svgElements.shapes) {
        expect(['circle', 'path', 'polygon', 'line']).toContain(shape.type);
        expect(Object.keys(shape.attributes).length).toBeGreaterThan(0);
      }
    }
  });

  it('all 12 palettes have valid colors and required structure', () => {
    expect(COVER_PALETTES.length).toBe(12);

    for (const p of COVER_PALETTES) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.gradient.length).toBe(3);
      expect(p.gradient[0].startsWith('#')).toBe(true);
      expect(p.gradient[1].startsWith('#')).toBe(true);
      expect(p.gradient[2].startsWith('#')).toBe(true);
      expect(p.primary.startsWith('#')).toBe(true);
      expect(p.secondary.startsWith('#')).toBe(true);
      expect(p.accent.startsWith('#')).toBe(true);
      expect(p.glow).toBeTruthy();
    }
  });
});

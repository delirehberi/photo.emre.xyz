import { describe, it, expect } from 'vitest';
import {
  formatMonthDTag,
  getAdjacentMonthDTags,
  parseCalendarList,
  createCalendarListTemplate,
} from '../../src/lib/nostr/schemas/calendar';
import { NOSTR_KINDS } from '../../src/lib/nostr/config';
import type { NostrEvent } from '../../src/lib/nostr/types';

describe('NIP-52 Calendar Lists (calendar.ts)', () => {
  const samplePubkey =
    '46f3c7bb33cc3019049b76dc89dbb96e34c247bdda68b6ad8632682793ff8a1a';
  const sampleCoord1 =
    '31923:46f3c7bb33cc3019049b76dc89dbb96e34c247bdda68b6ad8632682793ff8a1a:booking-1789397270312-zks09gx';
  const sampleCoord2 =
    '31922:21a565505809a8b15af94b2c23cdbcf25e01d7f571bd5bc51a651869ef8b0adc:hackathon-izmir-2026';

  it('formats month d-tag correctly from timestamp and Date', () => {
    // 2026-09-14
    const d = new Date(Date.UTC(2026, 8, 14, 12, 0, 0));
    expect(formatMonthDTag(d)).toBe('events-2026-09');

    const timestamp = Math.floor(d.getTime() / 1000);
    expect(formatMonthDTag(timestamp)).toBe('events-2026-09');
  });

  it('calculates adjacent monthly d-tags for querying relays', () => {
    const d = new Date(Date.UTC(2026, 8, 14)); // September 2026
    const adjacent = getAdjacentMonthDTags(d);
    expect(adjacent).toEqual([
      'events-2026-08',
      'events-2026-09',
      'events-2026-10',
    ]);
  });

  it('creates an EventTemplate for Kind 31924 with deduplicated coordinates', () => {
    const template = createCalendarListTemplate({
      dTag: 'events-2026-09',
      title: 'Eylül 2026 Phoem Etkinlikleri',
      description: 'Eylül ayı boyunca topluluk fotoğraf albümleri',
      coordinates: [sampleCoord1, sampleCoord2, sampleCoord1], // duplicate
      relayHints: {
        [sampleCoord1]: 'wss://relay.emre.xyz',
      },
    });

    expect(template.kind).toBe(NOSTR_KINDS.CALENDAR_LIST);
    expect(template.tags).toContainEqual(['d', 'events-2026-09']);
    expect(template.tags).toContainEqual([
      'title',
      'Eylül 2026 Phoem Etkinlikleri',
    ]);
    expect(template.tags).toContainEqual([
      'a',
      sampleCoord1,
      'wss://relay.emre.xyz',
    ]);
    expect(template.tags).toContainEqual(['a', sampleCoord2]);

    // Should only have 2 'a' tags despite duplicate in input
    const aTags = template.tags.filter((t) => t[0] === 'a');
    expect(aTags).toHaveLength(2);
  });

  it('parses a Kind 31924 event into a typed CalendarList', () => {
    const event: NostrEvent = {
      id: 'event-list-id-123456',
      pubkey: samplePubkey,
      kind: 31924,
      created_at: 1789397300,
      tags: [
        ['d', 'events-2026-09'],
        ['title', 'Eylül 2026 Etkinlikleri'],
        ['description', 'Açıklama metni'],
        ['a', sampleCoord1],
        ['a', sampleCoord2],
      ],
      content: 'Açıklama metni',
      sig: 'mock-sig',
    };

    const parsed = parseCalendarList(event);
    expect(parsed.id).toBe(event.id);
    expect(parsed.pubkey).toBe(samplePubkey);
    expect(parsed.dTag).toBe('events-2026-09');
    expect(parsed.title).toBe('Eylül 2026 Etkinlikleri');
    expect(parsed.description).toBe('Açıklama metni');
    expect(parsed.coordinates).toEqual([sampleCoord1, sampleCoord2]);
  });

  it('rejects events with wrong kind or missing d-tag', () => {
    const badKindEvent: NostrEvent = {
      id: 'bad-kind',
      pubkey: samplePubkey,
      kind: 31922,
      created_at: 1789397300,
      tags: [['d', 'events-2026-09']],
      content: '',
      sig: 'sig',
    };
    expect(() => parseCalendarList(badKindEvent)).toThrow(/Invalid event kind/);

    const missingDTagEvent: NostrEvent = {
      id: 'missing-d',
      pubkey: samplePubkey,
      kind: 31924,
      created_at: 1789397300,
      tags: [['title', 'No d-tag']],
      content: '',
      sig: 'sig',
    };
    expect(() => parseCalendarList(missingDTagEvent)).toThrow(
      /Missing mandatory "d" tag/,
    );
  });
});

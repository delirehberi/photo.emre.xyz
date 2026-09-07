import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateSecretKey,
  getPublicKey,
  finalizeEvent,
} from 'nostr-tools/pure';
import {
  fetchEventAlbums,
  fetchOrgWithEvents,
} from '../../src/lib/nostr/events-data';
import * as poolModule from '../../src/lib/nostr/pool';
import { NOSTR_KINDS } from '../../src/lib/nostr/config';
import type { NostrEvent } from '../../src/lib/nostr/types';

describe('events-data production data fetcher', () => {
  const secretKey = generateSecretKey();
  const pubkey = getPublicKey(secretKey);

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns an empty array when no events are published on relays (no seed/demo content)', async () => {
    const mockPool = {
      queryEvents: vi.fn().mockResolvedValue([]),
      queryOne: vi.fn().mockResolvedValue(null),
    };
    vi.spyOn(poolModule, 'getSharedRelayPool').mockReturnValue(
      mockPool as unknown as ReturnType<typeof poolModule.getSharedRelayPool>,
    );

    const albums = await fetchEventAlbums();
    expect(albums).toEqual([]);
    expect(albums).toHaveLength(0);
  });

  it('fetches real event albums, calculates photo counts, and resolves author profile without demo content', async () => {
    const albumEvent: NostrEvent = finalizeEvent(
      {
        kind: NOSTR_KINDS.EVENT_ALBUM,
        created_at: 1770000000,
        tags: [
          ['d', 'production-event-2026'],
          ['title', 'Real Production Event'],
          ['summary', 'Official event album on Nostr network'],
          ['t', 'event-album'],
          ['location', 'Istanbul, TR'],
          ['start', '1770000000'],
        ],
        content: '',
      },
      secretKey,
    );

    const coord = `${NOSTR_KINDS.EVENT_ALBUM}:${pubkey}:production-event-2026`;

    // 2 photo events referencing this album coordinate
    const photo1: NostrEvent = finalizeEvent(
      {
        kind: NOSTR_KINDS.PHOTO_METADATA,
        created_at: 1770000100,
        tags: [
          ['url', 'https://media.emre.xyz/img1.jpg'],
          [
            'x',
            'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          ],
          ['dim', '1920x1080'],
          ['m', 'image/jpeg'],
          ['a', coord],
        ],
        content: 'Photo 1',
      },
      secretKey,
    );

    const photo2: NostrEvent = finalizeEvent(
      {
        kind: NOSTR_KINDS.PHOTO_METADATA,
        created_at: 1770000200,
        tags: [
          ['url', 'https://media.emre.xyz/img2.jpg'],
          [
            'x',
            'a3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b866',
          ],
          ['dim', '1080x1920'],
          ['m', 'image/jpeg'],
          ['a', coord],
        ],
        content: 'Photo 2',
      },
      secretKey,
    );

    // Kind 0 profile event for author
    const profileEvent: NostrEvent = finalizeEvent(
      {
        kind: NOSTR_KINDS.METADATA,
        created_at: 1770000000,
        tags: [],
        content: JSON.stringify({
          name: 'prodorg',
          display_name: 'Production Organization',
          about: 'Live community organization on Nostr',
          nip05: 'org@emre.xyz',
        }),
      },
      secretKey,
    );

    const mockPool = {
      queryEvents: vi.fn().mockImplementation((_relays, filter) => {
        if (filter.kinds?.includes(NOSTR_KINDS.EVENT_ALBUM)) {
          return Promise.resolve([albumEvent]);
        }
        if (filter.kinds?.includes(NOSTR_KINDS.PHOTO_METADATA)) {
          return Promise.resolve([photo1, photo2]);
        }
        if (filter.kinds?.includes(NOSTR_KINDS.METADATA)) {
          return Promise.resolve([profileEvent]);
        }
        return Promise.resolve([]);
      }),
      queryOne: vi.fn().mockResolvedValue(null),
    };
    vi.spyOn(poolModule, 'getSharedRelayPool').mockReturnValue(
      mockPool as unknown as ReturnType<typeof poolModule.getSharedRelayPool>,
    );

    const results = await fetchEventAlbums();

    expect(results).toHaveLength(1);
    expect(results[0].album.dTag).toBe('production-event-2026');
    expect(results[0].album.title).toBe('Real Production Event');
    expect(results[0].photoCount).toBe(2);
    expect(results[0].org?.displayName).toBe('Production Organization');
    expect(results[0].org?.nip05).toBe('org@emre.xyz');

    // Ensure no demo seed titles or tags exist in results
    const titles = results.map((r) => r.album.title);
    expect(titles).not.toContain('Nostr Berlin Hackathon 2026');
    expect(titles).not.toContain('Bitcoin Lightning Zirvesi İstanbul');
    expect(titles).not.toContain('Özgür Üreticiler ve Fotoğrafçılar Kampı');
  });

  it('fetchOrgWithEvents returns only real events without mock seed albums', async () => {
    const albumEvent: NostrEvent = finalizeEvent(
      {
        kind: NOSTR_KINDS.EVENT_ALBUM,
        created_at: 1770000500,
        tags: [
          ['d', 'community-meetup'],
          ['title', 'Community Meetup 2026'],
          ['summary', 'Live gathering'],
          ['t', 'event-album'],
        ],
        content: '',
      },
      secretKey,
    );

    const profileEvent: NostrEvent = finalizeEvent(
      {
        kind: NOSTR_KINDS.METADATA,
        created_at: 1770000000,
        tags: [],
        content: JSON.stringify({
          name: 'live-group',
          display_name: 'Live Group',
        }),
      },
      secretKey,
    );

    const mockPool = {
      queryOne: vi.fn().mockResolvedValue(profileEvent),
      queryEvents: vi.fn().mockResolvedValue([albumEvent]),
    };
    vi.spyOn(poolModule, 'getSharedRelayPool').mockReturnValue(
      mockPool as unknown as ReturnType<typeof poolModule.getSharedRelayPool>,
    );

    const data = await fetchOrgWithEvents(pubkey);

    expect(data.org.displayName).toBe('Live Group');
    expect(data.events).toHaveLength(1);
    expect(data.events[0].dTag).toBe('community-meetup');

    // Verify no demo seed events are appended
    const dTags = data.events.map((e) => e.dTag);
    expect(dTags).not.toContain('berlin-hackathon-2026');
    expect(dTags).not.toContain('lightning-summit-istanbul');
    expect(dTags).not.toContain('sovereign-creators-camp');
  });

  it('gracefully handles relay errors and returns an empty array', async () => {
    const mockPool = {
      queryEvents: vi
        .fn()
        .mockRejectedValue(new Error('Relay connection failed')),
      queryOne: vi.fn().mockRejectedValue(new Error('Relay connection failed')),
    };
    vi.spyOn(poolModule, 'getSharedRelayPool').mockReturnValue(
      mockPool as unknown as ReturnType<typeof poolModule.getSharedRelayPool>,
    );

    const albums = await fetchEventAlbums();
    expect(albums).toEqual([]);
  });
});

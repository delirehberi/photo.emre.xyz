import { describe, it, expect } from 'vitest';
import { slugify } from '../../src/components/admin/EventAlbumCreator';
import { formatEventDateTime } from '../../src/lib/nostr/events-data';

describe('Event Slugs & Slugification', () => {
  it('correctly slugifies standard Latin text', () => {
    expect(slugify('Nostr Hackathon 2026')).toBe('nostr-hackathon-2026');
    expect(slugify('  Cosplay Community Meetup!  ')).toBe(
      'cosplay-community-meetup',
    );
  });

  it('correctly transliterates Turkish characters', () => {
    expect(slugify('İzmir Fotoğrafçılık Buluşması ve Speaking Club')).toBe(
      'izmir-fotografcilik-bulusmasi-ve-speaking-club',
    );
    expect(slugify('Çoğul Şölen Öğleden Sonra')).toBe(
      'cogul-solen-ogleden-sonra',
    );
    expect(slugify('Işık Şehri')).toBe('isik-sehri');
  });

  it('strips punctuation, emojis, and consecutive hyphens', () => {
    expect(slugify('Hello & World @ 2026 -- Test!!')).toBe(
      'hello-world-2026-test',
    );
    expect(slugify('Cosplay 🎭 Speaking 💬 Club')).toBe(
      'cosplay-speaking-club',
    );
  });

  it('returns empty string for pure symbols allowing fallback', () => {
    expect(slugify('???---!!!')).toBe('');
  });
});

describe('Event Date & Time Formatting (formatEventDateTime)', () => {
  it('formats date and time when specific non-midnight hour/minute is provided', () => {
    const d = new Date(2026, 8, 15, 19, 30, 0);
    const ts = Math.floor(d.getTime() / 1000);

    const formattedTr = formatEventDateTime(ts, 'tr');
    expect(formattedTr).toContain('15');
    expect(formattedTr).toContain('19:30');

    const formattedEn = formatEventDateTime(ts, 'en');
    expect(formattedEn).toContain('15');
    expect(formattedEn).toMatch(/19:30|7:30/);
  });

  it('formats date-only when midnight UTC/local is provided', () => {
    const d = new Date(Date.UTC(2026, 8, 15, 0, 0, 0));
    const ts = Math.floor(d.getTime() / 1000);

    const formatted = formatEventDateTime(ts, 'tr');
    expect(formatted).toContain('15');
  });

  it('formats start and end range on same day', () => {
    const start = new Date(2026, 8, 15, 14, 0, 0);
    const end = new Date(2026, 8, 15, 18, 0, 0);

    const formatted = formatEventDateTime(
      Math.floor(start.getTime() / 1000),
      'tr',
      Math.floor(end.getTime() / 1000),
    );

    expect(formatted).toContain('14:00');
    expect(formatted).toContain('18:00');
    expect(formatted).toContain('–');
  });
});

describe('Category and Tag Filtering Logic', () => {
  it('correctly matches speaking club variations', () => {
    const tags1 = ['speaking club', 'istanbul'];
    const tags2 = ['speaking-club', 'english'];
    const tags3 = ['speakingclub', 'practice'];
    const tags4 = ['hackathon', 'bitcoin'];

    const matchSpeakingClub = (tags: string[]) =>
      tags.some((t) => {
        const lower = t.toLowerCase();
        return (
          lower === 'speaking club' ||
          lower === 'speaking-club' ||
          lower === 'speakingclub' ||
          lower === 'speaking_club' ||
          lower.includes('speaking')
        );
      });

    expect(matchSpeakingClub(tags1)).toBe(true);
    expect(matchSpeakingClub(tags2)).toBe(true);
    expect(matchSpeakingClub(tags3)).toBe(true);
    expect(matchSpeakingClub(tags4)).toBe(false);
  });

  it('correctly matches cosplay category', () => {
    const tags1 = ['cosplay', 'anime'];
    const tags2 = ['cosplayers', 'istanbul'];
    const tags3 = ['meetup', 'tech'];

    const matchCosplay = (tags: string[]) =>
      tags.some((t) => t.toLowerCase().includes('cosplay'));

    expect(matchCosplay(tags1)).toBe(true);
    expect(matchCosplay(tags2)).toBe(true);
    expect(matchCosplay(tags3)).toBe(false);
  });

  it('correctly matches community category in Turkish and English', () => {
    const tags1 = ['community', 'web3'];
    const tags2 = ['topluluk', 'izmir'];
    const tags3 = ['conference'];

    const matchCommunity = (tags: string[]) =>
      tags.some((t) => {
        const lower = t.toLowerCase();
        return lower === 'community' || lower === 'topluluk';
      });

    expect(matchCommunity(tags1)).toBe(true);
    expect(matchCommunity(tags2)).toBe(true);
    expect(matchCommunity(tags3)).toBe(false);
  });
});

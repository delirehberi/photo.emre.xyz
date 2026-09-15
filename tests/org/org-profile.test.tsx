import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { OrgProfileView } from '../../src/components/org/OrgProfileView';
import type {
  OrganizationProfile,
  EventAlbum,
} from '../../src/lib/nostr/types';

const mockOrg: OrganizationProfile = {
  pubkey: '98182f30488fff70e08423974637eba1998af7cd7583ba2d1b542cd6344b2e25',
  name: 'webend',
  displayName: 'Webend.org',
  about: 'Independent tech community on Nostr',
  picture: 'https://media.emre.xyz/webend.png',
  banner: 'https://media.emre.xyz/banner.jpg',
  nip05: 'info@webend.org',
  website: 'https://webend.org',
  lud16: 'webend@getalby.com',
  createdAt: 1700000000,
};

const mockEvent: EventAlbum = {
  id: 'event-id-1',
  pubkey: '98182f30488fff70e08423974637eba1998af7cd7583ba2d1b542cd6344b2e25',
  dTag: 'hackathon-2026',
  title: 'Webend Hackathon 2026',
  summary: 'Annual hackathon album',
  coverImage: 'https://media.emre.xyz/cover.jpg',
  startDate: 1770000000,
  location: 'Istanbul, TR',
  tags: ['event-album', 'community'],
  coordinate:
    '31922:98182f30488fff70e08423974637eba1998af7cd7583ba2d1b542cd6344b2e25:hackathon-2026',
  createdAt: 1770000000,
};

describe('OrgProfileView Component', () => {
  it('renders organization details, banner, avatar and nip05 badge', () => {
    const html = renderToString(
      <OrgProfileView
        initialOrg={mockOrg}
        initialEvents={[mockEvent]}
        pubkey={mockOrg.pubkey}
        initialLocale="tr"
      />,
    );

    expect(html).toContain('Webend.org');
    expect(html).toContain('Independent tech community on Nostr');
    expect(html).toContain('info@webend.org');
    expect(html).toContain('https://webend.org');
    expect(html).toContain('webend@getalby.com');
    expect(html).toContain('Webend Hackathon 2026');
    expect(html).toContain('Istanbul, TR');
  });

  it('renders empty state message when organization has no events', () => {
    const htmlTr = renderToString(
      <OrgProfileView
        initialOrg={mockOrg}
        initialEvents={[]}
        pubkey={mockOrg.pubkey}
        initialLocale="tr"
      />,
    );
    expect(htmlTr).toContain(
      'Bu organizasyona ait henüz yayınlanmış etkinlik albümü yok.',
    );

    const htmlEn = renderToString(
      <OrgProfileView
        initialOrg={mockOrg}
        initialEvents={[]}
        pubkey={mockOrg.pubkey}
        initialLocale="en"
      />,
    );
    expect(htmlEn).toContain(
      'No event albums published by this organisation yet.',
    );
  });

  it('renders refresh button for live Nostr relay re-sync', () => {
    const html = renderToString(
      <OrgProfileView
        initialOrg={mockOrg}
        initialEvents={[]}
        pubkey={mockOrg.pubkey}
        initialLocale="tr"
      />,
    );
    expect(html).toContain('Rölelerden Yenile');
  });
});

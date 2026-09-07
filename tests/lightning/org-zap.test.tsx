import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { OrgZapButton } from '../../src/components/lightning/OrgZapButton';
import type { OrganizationProfile } from '../../src/lib/nostr/types';

const baseOrg: OrganizationProfile = {
  pubkey: '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245',
  name: 'speakingclub',
  displayName: 'Speaking Club Istanbul',
  about: 'English speaking club community',
  picture: 'https://media.emre.xyz/avatar.jpg',
  createdAt: 1700000000,
};

describe('OrgZapButton Component', () => {
  it('renders null / empty when organization has no lud16 and no lud06', () => {
    const orgWithoutLnurl: OrganizationProfile = {
      ...baseOrg,
      lud16: undefined,
      lud06: undefined,
    };

    const html = renderToString(<OrgZapButton org={orgWithoutLnurl} />);
    expect(html).toBe('');
  });

  it('renders Send Zap button when lud16 Lightning Address is configured', () => {
    const orgWithLud16: OrganizationProfile = {
      ...baseOrg,
      lud16: 'speakingclub@getalby.com',
    };

    const htmlTr = renderToString(
      <OrgZapButton org={orgWithLud16} locale="tr" />,
    );
    expect(htmlTr).toContain('Zap Gönder');

    const htmlEn = renderToString(
      <OrgZapButton org={orgWithLud16} locale="en" />,
    );
    expect(htmlEn).toContain('Send Zap');
  });

  it('renders Send Zap button when lud06 bech32 LNURL is configured', () => {
    const orgWithLud06: OrganizationProfile = {
      ...baseOrg,
      lud16: undefined,
      lud06:
        'lnurl1dp68gurn8ghj7em9w3skccne9e3k7mf09emk2mrv944kummhdchkcmn4wfk8qtm9d4ex2h47d0d',
    };

    const html = renderToString(
      <OrgZapButton org={orgWithLud06} locale="tr" />,
    );
    expect(html).toContain('Zap Gönder');
  });
});

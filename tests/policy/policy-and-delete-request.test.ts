import { describe, it, expect } from 'vitest';
import {
  resolveUploaderKey,
  getClientLinks,
  buildDeleteRequestMessage,
} from '../../src/lib/nostr/delete-request';
import { trDictionary } from '../../src/lib/i18n/tr';
import { enDictionary } from '../../src/lib/i18n/en';
import { GET as sitemapEndpoint } from '../../src/pages/sitemap.xml';

describe('Policy and Delete Request Features', () => {
  const TEST_HEX =
    '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245';
  const TEST_NPUB =
    'npub1xtscya34g58tk0z605fvr788k263gsu6cy9x0mhnm87echrgufzsevkk5s';

  describe('resolveUploaderKey', () => {
    it('resolves valid 64-character hex public key to npub', () => {
      const res = resolveUploaderKey(TEST_HEX);
      expect(res.isValid).toBe(true);
      expect(res.hex).toBe(TEST_HEX);
      expect(res.npub).toBe(TEST_NPUB);
    });

    it('resolves valid Bech32 npub to hex', () => {
      const res = resolveUploaderKey(TEST_NPUB);
      expect(res.isValid).toBe(true);
      expect(res.hex).toBe(TEST_HEX);
      expect(res.npub).toBe(TEST_NPUB);
    });

    it('gracefully handles invalid strings', () => {
      expect(resolveUploaderKey('').isValid).toBe(false);
      expect(resolveUploaderKey('invalid-pubkey').isValid).toBe(false);
      expect(resolveUploaderKey('npub1invalid12345').isValid).toBe(false);
      expect(resolveUploaderKey('12345').isValid).toBe(false);
    });
  });

  describe('getClientLinks', () => {
    it('generates standard Nostr client links and native protocol URI', () => {
      const links = getClientLinks(TEST_NPUB);
      expect(links.primal).toBe(`https://primal.net/p/${TEST_NPUB}`);
      expect(links.njump).toBe(`https://njump.me/${TEST_NPUB}`);
      expect(links.coracle).toBe(`https://coracle.social/${TEST_NPUB}`);
      expect(links.native).toBe(`nostr:${TEST_NPUB}`);
    });
  });

  describe('buildDeleteRequestMessage', () => {
    const sampleHash =
      'a3f5b8c9d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8';
    const sampleUrl = 'https://blossom.example.com/' + sampleHash;
    const sampleAlbum = 'istanbul-hackathon-2026';

    it('generates a detailed Turkish message with all cryptographic identifiers', () => {
      const msg = buildDeleteRequestMessage({
        photoHash: sampleHash,
        photoUrl: sampleUrl,
        album: sampleAlbum,
        reason: 'likeness',
        additionalNotes: 'Lütfen kaldırınız',
        locale: 'tr',
      });

      expect(msg).toContain('Merhaba,');
      expect(msg).toContain(sampleHash);
      expect(msg).toContain(sampleUrl);
      expect(msg).toContain(sampleAlbum);
      expect(msg).toContain('Kişisel Görüntü ve Mahremiyet Hakkı');
      expect(msg).toContain('Lütfen kaldırınız');
      expect(msg).toContain('https://photo.emre.xyz/policy');
    });

    it('generates a detailed English message with all cryptographic identifiers', () => {
      const msg = buildDeleteRequestMessage({
        photoHash: sampleHash,
        photoUrl: sampleUrl,
        album: sampleAlbum,
        reason: 'privacy',
        additionalNotes: 'Private moment',
        locale: 'en',
      });

      expect(msg).toContain('Hello,');
      expect(msg).toContain(sampleHash);
      expect(msg).toContain(sampleUrl);
      expect(msg).toContain(sampleAlbum);
      expect(msg).toContain('Personal privacy');
      expect(msg).toContain('Private moment');
      expect(msg).toContain('https://photo.emre.xyz/en/policy');
    });
  });

  describe('i18n dictionary completeness', () => {
    it('has all required policy keys in both tr and en', () => {
      const policyKeys = [
        'title',
        'subtitle',
        'badge',
        'sovereigntyTitle',
        'sovereigntyDesc',
        'likenessRightsTitle',
        'likenessRightsDesc',
        'photographerDutiesTitle',
        'photographerDutiesDesc',
        'technicalDeletionTitle',
        'technicalDeletionDesc',
        'blossomMechanism',
        'nostrMechanism',
        'resolutionStepsTitle',
        'step1Title',
        'step1Desc',
        'step2Title',
        'step2Desc',
        'step3Title',
        'step3Desc',
        'ctaTitle',
        'ctaDesc',
        'ctaBtn',
      ] as const;

      for (const k of policyKeys) {
        expect(trDictionary.policy[k]).toBeDefined();
        expect(typeof trDictionary.policy[k]).toBe('string');
        expect(trDictionary.policy[k].length).toBeGreaterThan(0);

        expect(enDictionary.policy[k]).toBeDefined();
        expect(typeof enDictionary.policy[k]).toBe('string');
        expect(enDictionary.policy[k].length).toBeGreaterThan(0);
      }
    });

    it('has all required deleteRequest keys in both tr and en', () => {
      const deleteKeys = [
        'title',
        'subtitle',
        'badge',
        'introAlert',
        'formTitle',
        'photoHashLabel',
        'photoHashPlaceholder',
        'photoUrlLabel',
        'photoUrlPlaceholder',
        'uploaderLabel',
        'uploaderPlaceholder',
        'albumLabel',
        'albumPlaceholder',
        'reasonLabel',
        'reasonLikeness',
        'reasonCopyright',
        'reasonPrivacy',
        'reasonOther',
        'additionalDetailsLabel',
        'additionalDetailsPlaceholder',
        'contactUploaderTitle',
        'contactUploaderDesc',
        'openInPrimal',
        'openInNjump',
        'openInCoracle',
        'openInNostrApp',
        'copyMessageBtn',
        'messageCopied',
        'messageTemplateLabel',
        'sendDirectDm',
        'dmSentSuccess',
        'fallbackTitle',
        'fallbackDesc',
        'blossomTakedownTitle',
        'blossomTakedownDesc',
        'escalateToPlatform',
        'emptyUploaderNotice',
        'invalidHashNotice',
        'resolvedNpub',
        'copyNpub',
        'copiedNpub',
        'readPolicyLink',
        'howItWorksTitle',
        'step1Guide',
        'step2Guide',
        'step3Guide',
      ] as const;

      for (const k of deleteKeys) {
        expect(trDictionary.deleteRequest[k]).toBeDefined();
        expect(typeof trDictionary.deleteRequest[k]).toBe('string');
        expect(trDictionary.deleteRequest[k].length).toBeGreaterThan(0);

        expect(enDictionary.deleteRequest[k]).toBeDefined();
        expect(typeof enDictionary.deleteRequest[k]).toBe('string');
        expect(enDictionary.deleteRequest[k].length).toBeGreaterThan(0);
      }
    });

    it('has footer.policy and footer.deleteRequest in both languages', () => {
      expect(trDictionary.footer.policy).toBeTruthy();
      expect(trDictionary.footer.deleteRequest).toBeTruthy();
      expect(enDictionary.footer.policy).toBeTruthy();
      expect(enDictionary.footer.deleteRequest).toBeTruthy();
    });
  });

  describe('Sitemap Indexing', () => {
    it('includes /policy and /delete-request in dynamic XML sitemap', async () => {
      const mockContext = {
        site: new URL('https://photo.emre.xyz'),
        url: new URL('https://photo.emre.xyz/sitemap.xml'),
        request: new Request('https://photo.emre.xyz/sitemap.xml'),
        params: {},
        props: {},
        locals: {},
      } as unknown as Parameters<typeof sitemapEndpoint>[0];

      const response = await sitemapEndpoint(mockContext);
      expect(response.status).toBe(200);

      const xml = await response.text();
      expect(xml).toContain('<loc>https://photo.emre.xyz/policy</loc>');
      expect(xml).toContain('<loc>https://photo.emre.xyz/en/policy</loc>');
      expect(xml).toContain('<loc>https://photo.emre.xyz/delete-request</loc>');
      expect(xml).toContain(
        '<loc>https://photo.emre.xyz/en/delete-request</loc>',
      );
    });
  });
});

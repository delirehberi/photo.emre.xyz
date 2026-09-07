import { describe, it, expect } from 'vitest';
import {
  getLnurlPayUrl,
  createZapRequestTemplate,
  generateInvoiceQrDataUrl,
} from '../../src/lib/lightning/lnurl';
import { DEFAULT_PLATFORM_LUD16 } from '../../src/lib/lightning/config';

describe('LNURL-pay & Zap Request Generator', () => {
  it('correctly transforms LUD-16 addresses into LNURL-pay well-known endpoints', () => {
    expect(getLnurlPayUrl('delirehberi@emre.xyz')).toBe(
      'https://emre.xyz/.well-known/lnurlp/delirehberi',
    );
    expect(getLnurlPayUrl('alice@getalby.com')).toBe(
      'https://getalby.com/.well-known/lnurlp/alice',
    );
    expect(getLnurlPayUrl(DEFAULT_PLATFORM_LUD16)).toBe(
      'https://emre.xyz/.well-known/lnurlp/delirehberi',
    );
  });

  it('correctly resolves bech32 lnurl1 addresses into target URLs', () => {
    // lnurl1dp68gurn8ghj7em9w3skccne9e3k7mf09emk2mrv944kummhdchkcmn4wfk8qtm9d4ex2h47d0d is https://getalby.com/.well-known/lnurlp/emre
    const lnurl =
      'lnurl1dp68gurn8ghj7em9w3skccne9e3k7mf09emk2mrv944kummhdchkcmn4wfk8qtm9d4ex2h47d0d';
    expect(getLnurlPayUrl(lnurl)).toBe(
      'https://getalby.com/.well-known/lnurlp/emre',
    );
  });

  it('throws on invalid LUD-16 address format', () => {
    expect(() => getLnurlPayUrl('notanemail')).toThrow(
      /Invalid Lightning Address format/,
    );
    expect(() => getLnurlPayUrl('@emre.xyz')).toThrow(
      /Invalid Lightning Address format/,
    );
    expect(() => getLnurlPayUrl('delirehberi@')).toThrow(
      /Invalid Lightning Address format/,
    );
    expect(() => getLnurlPayUrl('')).toThrow(
      /Invalid Lightning Address format/,
    );
  });

  it('crafts compliant NIP-57 Zap Request template with exact millisats and action tag', () => {
    const template = createZapRequestTemplate({
      amountSats: 100,
      action: 'create_organization',
      recipientPubkey:
        '46f3c7bb33cc3019049b76dc89dbb96e34c247bdda68b6ad8632682793ff8a1a',
      lnurlEndpoint: 'https://emre.xyz/.well-known/lnurlp/delirehberi',
      memo: 'Payment for org creation',
    });

    expect(template.kind).toBe(9734);
    expect(template.content).toBe('Payment for org creation');

    const amountTag = template.tags.find((t) => t[0] === 'amount');
    expect(amountTag).toBeDefined();
    expect(amountTag?.[1]).toBe('100000'); // 100 sats = 100,000 millisats

    const actionTag = template.tags.find((t) => t[0] === 'action');
    expect(actionTag).toBeDefined();
    expect(actionTag?.[1]).toBe('create_organization');

    const pTag = template.tags.find((t) => t[0] === 'p');
    expect(pTag?.[1]).toBe(
      '46f3c7bb33cc3019049b76dc89dbb96e34c247bdda68b6ad8632682793ff8a1a',
    );

    const lnurlTag = template.tags.find((t) => t[0] === 'lnurl');
    expect(lnurlTag?.[1]).toBe(
      'https://emre.xyz/.well-known/lnurlp/delirehberi',
    );
  });

  it('generates a valid QR code data URL from a BOLT-11 invoice string', async () => {
    const fakeBolt11 =
      'lnbc100n1p3xxxxxxpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdp42ysxxatsyp3k7enxv4jsxqzpuaztrnwngzn3kcd5wpnvqldn8q6q3e5p9mm2j2q';
    const qrDataUrl = await generateInvoiceQrDataUrl(fakeBolt11);
    expect(qrDataUrl).toBeDefined();
    expect(qrDataUrl.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('throws when generating QR code for empty invoice string', async () => {
    await expect(generateInvoiceQrDataUrl('')).rejects.toThrow(
      /Cannot generate QR code for empty invoice/,
    );
  });
});

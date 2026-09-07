import { describe, it, expect } from 'vitest';
import { calculateActionFee } from '../../src/lib/lightning/rates';
import { LIGHTNING_FEES } from '../../src/lib/lightning/config';
import { DEFAULT_ADMIN_PUBKEY } from '../../src/lib/nostr/config';

describe('Lightning Rate Enforcement & Pricing Engine', () => {
  const regularUserPubkey =
    '0000000000000000000000000000000000000000000000000000000000000001';

  it('calculates 100 sats for organization creation for standard user', () => {
    const quote = calculateActionFee('create_organization', {
      userPubkey: regularUserPubkey,
      isTestMode: false,
    });
    expect(quote.action).toBe('create_organization');
    expect(quote.totalSats).toBe(LIGHTNING_FEES.CREATE_ORGANIZATION);
    expect(quote.totalSats).toBe(100);
    expect(quote.isExempt).toBe(false);
  });

  it('calculates 100 sats for album creation for standard user', () => {
    const quote = calculateActionFee('create_album', {
      userPubkey: regularUserPubkey,
      isTestMode: false,
    });
    expect(quote.action).toBe('create_album');
    expect(quote.totalSats).toBe(LIGHTNING_FEES.CREATE_ALBUM);
    expect(quote.totalSats).toBe(100);
    expect(quote.isExempt).toBe(false);
  });

  it('calculates 21 sats per image for single upload', () => {
    const quote = calculateActionFee('upload_image', {
      count: 1,
      userPubkey: regularUserPubkey,
      isTestMode: false,
    });
    expect(quote.action).toBe('upload_image');
    expect(quote.unitFeeSats).toBe(21);
    expect(quote.totalSats).toBe(21);
    expect(quote.quantity).toBe(1);
    expect(quote.isExempt).toBe(false);
  });

  it('calculates 21 * N sats for multi-image uploads', () => {
    const quote = calculateActionFee('upload_image', {
      count: 5,
      userPubkey: regularUserPubkey,
      isTestMode: false,
    });
    expect(quote.action).toBe('upload_image');
    expect(quote.unitFeeSats).toBe(21);
    expect(quote.totalSats).toBe(105);
    expect(quote.quantity).toBe(5);
    expect(quote.isExempt).toBe(false);
  });

  it('sanitizes non-positive or float quantities to at least 1', () => {
    const quoteZero = calculateActionFee('upload_image', {
      count: 0,
      userPubkey: regularUserPubkey,
      isTestMode: false,
    });
    expect(quoteZero.quantity).toBe(1);
    expect(quoteZero.totalSats).toBe(21);

    const quoteFloat = calculateActionFee('upload_image', {
      count: 3.8,
      userPubkey: regularUserPubkey,
      isTestMode: false,
    });
    expect(quoteFloat.quantity).toBe(3);
    expect(quoteFloat.totalSats).toBe(63);
  });

  it('enforces 0 sat admin bypass for ADMIN_PUBKEY across all actions', () => {
    const orgQuote = calculateActionFee('create_organization', {
      userPubkey: DEFAULT_ADMIN_PUBKEY,
      isTestMode: false,
    });
    expect(orgQuote.totalSats).toBe(0);
    expect(orgQuote.isExempt).toBe(true);
    expect(orgQuote.description).toContain('Admin Exemption: 0 sats');

    const albumQuote = calculateActionFee('create_album', {
      userPubkey: DEFAULT_ADMIN_PUBKEY,
      isTestMode: false,
    });
    expect(albumQuote.totalSats).toBe(0);
    expect(albumQuote.isExempt).toBe(true);

    const uploadQuote = calculateActionFee('upload_image', {
      count: 10,
      userPubkey: DEFAULT_ADMIN_PUBKEY,
      isTestMode: false,
    });
    expect(uploadQuote.totalSats).toBe(0);
    expect(uploadQuote.isExempt).toBe(true);
  });

  it('treats missing or null pubkey as non-exempt standard rate in production', () => {
    const quoteNull = calculateActionFee('create_organization', {
      userPubkey: null,
      isTestMode: false,
    });
    expect(quoteNull.totalSats).toBe(100);
    expect(quoteNull.isExempt).toBe(false);

    const quoteUndefined = calculateActionFee('create_organization', {
      isTestMode: false,
    });
    expect(quoteUndefined.totalSats).toBe(100);
    expect(quoteUndefined.isExempt).toBe(false);
  });

  it('enforces 0 sats free exemption for all users when test mode is active', () => {
    const orgQuote = calculateActionFee('create_organization', {
      userPubkey: regularUserPubkey,
      isTestMode: true,
    });
    expect(orgQuote.totalSats).toBe(0);
    expect(orgQuote.isExempt).toBe(true);
    expect(orgQuote.description).toContain('Test Mode: Free / 0 sats');

    const albumQuote = calculateActionFee('create_album', {
      userPubkey: regularUserPubkey,
      isTestMode: true,
    });
    expect(albumQuote.totalSats).toBe(0);
    expect(albumQuote.isExempt).toBe(true);

    const uploadQuote = calculateActionFee('upload_image', {
      count: 20,
      userPubkey: regularUserPubkey,
      isTestMode: true,
    });
    expect(uploadQuote.totalSats).toBe(0);
    expect(uploadQuote.isExempt).toBe(true);
  });
});

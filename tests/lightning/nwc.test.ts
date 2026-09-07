import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseNWCUrl,
  getStoredNWC,
  storeNWC,
  clearStoredNWC,
} from '../../src/lib/lightning/nwc';

describe('NIP-47 (NWC) Client & Storage', () => {
  const validWalletPubkey =
    'b889ff5b1513b641e2a139f661a661364979c5beee91842f8f0ef42ab558e9d4';
  const validSecret =
    '71a8c14c1407c113601079c4302dab36460f0ccd0ad506f1f2f9715d00fbff82';
  const validRelay = 'wss://relay.damus.io';
  const sampleUri = `nostr+walletconnect://${validWalletPubkey}?relay=${encodeURIComponent(validRelay)}&secret=${validSecret}&lud16=test%40emre.xyz`;

  beforeEach(() => {
    clearStoredNWC();
  });

  it('correctly parses valid NIP-47 connection URI', () => {
    const config = parseNWCUrl(sampleUri);
    expect(config.walletPubkey).toBe(validWalletPubkey);
    expect(config.relayUrl).toBe(validRelay);
    expect(config.secret).toBe(validSecret);
    expect(config.lud16).toBe('test@emre.xyz');
  });

  it('throws for non-nwc URI scheme', () => {
    expect(() => parseNWCUrl('https://photo.emre.xyz')).toThrow(
      /Invalid NWC connection URI scheme/,
    );
  });

  it('throws for empty or whitespace string', () => {
    expect(() => parseNWCUrl('')).toThrow(/empty/);
    expect(() => parseNWCUrl('   ')).toThrow(/empty/);
  });

  it('throws for malformed wallet pubkey or secret', () => {
    const invalidPubkeyUri = `nostr+walletconnect://invalid-pubkey?relay=${encodeURIComponent(validRelay)}&secret=${validSecret}`;
    expect(() => parseNWCUrl(invalidPubkeyUri)).toThrow();
  });

  it('stores and retrieves NWC connection from localStorage', () => {
    expect(getStoredNWC()).toBeNull();

    const stored = storeNWC(sampleUri);
    expect(stored.walletPubkey).toBe(validWalletPubkey);

    const retrieved = getStoredNWC();
    expect(retrieved).not.toBeNull();
    expect(retrieved?.walletPubkey).toBe(validWalletPubkey);
    expect(retrieved?.secret).toBe(validSecret);

    clearStoredNWC();
    expect(getStoredNWC()).toBeNull();
  });
});

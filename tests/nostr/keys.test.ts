import { describe, it, expect } from 'vitest';
import {
  generateNostrKeypair,
  validateNpub,
  validateNsec,
  validateHexKey,
  nsecToSecretKey,
  secretKeyToNsec,
  npubToHex,
  pubkeyToNpub,
  secretKeyToHex,
  hexToSecretKey,
  parseKeyInput,
  createKeyBackupJson,
} from '../../src/lib/nostr/keys';

describe('Nostr Key Management Utilities', () => {
  it('generates cryptographically valid keypairs with matching pubkey and npub', () => {
    const keypair = generateNostrKeypair();

    expect(keypair.secretKey).toBeInstanceOf(Uint8Array);
    expect(keypair.secretKey.length).toBe(32);
    expect(keypair.hexSecretKey).toHaveLength(64);
    expect(keypair.pubkey).toHaveLength(64);
    expect(keypair.nsec.startsWith('nsec1')).toBe(true);
    expect(keypair.npub.startsWith('npub1')).toBe(true);

    // Verify conversions match
    expect(npubToHex(keypair.npub)).toBe(keypair.pubkey);
    expect(pubkeyToNpub(keypair.pubkey)).toBe(keypair.npub);
    expect(secretKeyToNsec(keypair.secretKey)).toBe(keypair.nsec);
    expect(secretKeyToHex(keypair.secretKey)).toBe(keypair.hexSecretKey);
    expect(hexToSecretKey(keypair.hexSecretKey)).toEqual(keypair.secretKey);
  });

  it('validates correct and incorrect npub strings', () => {
    const keypair = generateNostrKeypair();
    expect(validateNpub(keypair.npub)).toBe(true);
    expect(validateNpub('npub1invalidbech32string')).toBe(false);
    expect(validateNpub('nsec1something')).toBe(false);
    expect(validateNpub('')).toBe(false);
    expect(validateNpub(null as unknown as string)).toBe(false);
  });

  it('validates correct and incorrect nsec strings', () => {
    const keypair = generateNostrKeypair();
    expect(validateNsec(keypair.nsec)).toBe(true);
    expect(validateNsec('nsec1invalidbech32string')).toBe(false);
    expect(validateNsec('npub1something')).toBe(false);
    expect(validateNsec('')).toBe(false);
  });

  it('validates 64-character hex keys', () => {
    const keypair = generateNostrKeypair();
    expect(validateHexKey(keypair.pubkey)).toBe(true);
    expect(validateHexKey(keypair.hexSecretKey)).toBe(true);
    expect(validateHexKey('not-a-hex-key')).toBe(false);
    expect(validateHexKey('12345')).toBe(false);
  });

  it('parses various key input formats accurately', () => {
    const keypair = generateNostrKeypair();

    // Bech32 nsec
    const parsedNsec = parseKeyInput(keypair.nsec);
    expect(parsedNsec.type).toBe('nsec');
    expect(parsedNsec.isValid).toBe(true);
    expect(parsedNsec.hex).toBe(keypair.hexSecretKey);
    expect(parsedNsec.secretKey).toEqual(keypair.secretKey);

    // Bech32 npub
    const parsedNpub = parseKeyInput(keypair.npub);
    expect(parsedNpub.type).toBe('npub');
    expect(parsedNpub.isValid).toBe(true);
    expect(parsedNpub.hex).toBe(keypair.pubkey);
    expect(parsedNpub.secretKey).toBeNull();

    // Hex pubkey
    const parsedHex = parseKeyInput(keypair.pubkey);
    expect(parsedHex.type).toBe('hex-pub');
    expect(parsedHex.isValid).toBe(true);
    expect(parsedHex.hex).toBe(keypair.pubkey);
    expect(parsedHex.bech32).toBe(keypair.npub);

    // Unknown/malformed
    const parsedUnknown = parseKeyInput('gibberish');
    expect(parsedUnknown.type).toBe('unknown');
    expect(parsedUnknown.isValid).toBe(false);
  });

  it('creates clean, parseable JSON backup document', () => {
    const keypair = generateNostrKeypair();
    const backupJson = createKeyBackupJson({
      pubkey: keypair.pubkey,
      npub: keypair.npub,
      nsec: keypair.nsec,
      name: 'Test Org',
    });

    const parsed = JSON.parse(backupJson);
    expect(parsed.name).toBe('Test Org');
    expect(parsed.publicKey.hex).toBe(keypair.pubkey);
    expect(parsed.publicKey.npub).toBe(keypair.npub);
    expect(parsed.privateKey.nsec).toBe(keypair.nsec);
    expect(parsed.notice).toContain('DO NOT SHARE');
  });

  it('throws on invalid decode inputs', () => {
    expect(() => nsecToSecretKey('invalid')).toThrow();
    expect(() => npubToHex('invalid')).toThrow();
    expect(() => pubkeyToNpub('invalid')).toThrow();
  });
});

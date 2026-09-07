import { describe, it, expect } from 'vitest';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import {
  generateUnlistedDTag,
  isHighEntropyDTag,
  getConversationKey,
  encryptPayload,
  decryptPayload,
} from '../../src/lib/nostr/unlisted';

describe('Unlisted Album Resolution & NIP-44 Encryption', () => {
  describe('High-Entropy d-Tags', () => {
    it('generates 32-character hex d-tags with 16 bytes entropy', () => {
      const slug1 = generateUnlistedDTag(16);
      const slug2 = generateUnlistedDTag(16);

      expect(slug1).toHaveLength(32);
      expect(slug2).toHaveLength(32);
      expect(slug1).not.toBe(slug2);
      expect(isHighEntropyDTag(slug1)).toBe(true);
    });

    it('distinguishes between human-readable slugs and high-entropy identifiers', () => {
      expect(isHighEntropyDTag('summer-2026')).toBe(false);
      expect(isHighEntropyDTag('berlin-hackathon')).toBe(false);
      expect(isHighEntropyDTag('private')).toBe(false);

      // 32-char hex is high-entropy
      expect(isHighEntropyDTag('4a8b1c3d9e2f5a6b7c8d9e0f1a2b3c4d')).toBe(true);
      // Base64url high-entropy
      expect(isHighEntropyDTag('vX8Z2kLmNpQrStUvWxYz01')).toBe(true);
    });
  });

  describe('NIP-44 v2 Encryption & Decryption', () => {
    it('performs end-to-end encrypted payload roundtrip', () => {
      const alicePriv = generateSecretKey();
      const alicePub = getPublicKey(alicePriv);

      const bobPriv = generateSecretKey();
      const bobPub = getPublicKey(bobPriv);

      // Alice derives conversation key with Bob
      const aliceKey = getConversationKey(alicePriv, bobPub);
      // Bob derives conversation key with Alice
      const bobKey = getConversationKey(bobPriv, alicePub);

      expect(aliceKey).toEqual(bobKey);

      const secretPayload = {
        title: 'Secret VIP Gala',
        location: 'Hidden Studio, Berlin',
        accessCode: 4281,
      };

      // Alice encrypts
      const ciphertext = encryptPayload(secretPayload, aliceKey);
      expect(typeof ciphertext).toBe('string');
      expect(ciphertext).not.toContain('Secret VIP Gala');

      // Bob decrypts
      const decrypted = decryptPayload<typeof secretPayload>(
        ciphertext,
        bobKey,
      );
      expect(decrypted).toEqual(secretPayload);
    });

    it('encrypts and decrypts plain strings', () => {
      const priv = generateSecretKey();
      const pub = getPublicKey(priv);
      const key = getConversationKey(priv, pub);

      const message = 'Secret album note';
      const ciphertext = encryptPayload(message, key);
      const decrypted = decryptPayload<string>(ciphertext, key);

      expect(decrypted).toBe(message);
    });

    it('accepts hex string private keys', () => {
      const priv = generateSecretKey();
      const privHex = Array.from(priv)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const pub = getPublicKey(priv);

      const keyFromBytes = getConversationKey(priv, pub);
      const keyFromHex = getConversationKey(privHex, pub);

      expect(keyFromHex).toEqual(keyFromBytes);
    });
  });
});

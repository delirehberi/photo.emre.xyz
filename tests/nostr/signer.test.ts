import { describe, it, expect, vi } from 'vitest';
import { verifyEvent } from 'nostr-tools/pure';
import { generateNostrKeypair } from '../../src/lib/nostr/keys';
import {
  PrivateKeySigner,
  ReadOnlySigner,
  Nip07Signer,
  Nip46Signer,
} from '../../src/lib/nostr/signer';
import type { EventTemplate } from '../../src/lib/nostr/types';

describe('Nostr Unified Signers', () => {
  const sampleTemplate: EventTemplate = {
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: 'Hello Nostr photo gallery',
  };

  describe('PrivateKeySigner', () => {
    it('signs event templates with valid Schnorr signatures', async () => {
      const keypair = generateNostrKeypair();
      const signer = new PrivateKeySigner(keypair.secretKey);

      expect(signer.type).toBe('privateKey');
      const pubkey = await signer.getPublicKey();
      expect(pubkey).toBe(keypair.pubkey);

      const signedEvent = await signer.signEvent(sampleTemplate);
      expect(signedEvent.pubkey).toBe(keypair.pubkey);
      expect(signedEvent.sig).toBeDefined();
      expect(verifyEvent(signedEvent)).toBe(true);
    });

    it('encrypts and decrypts messages with NIP-44', async () => {
      const alice = generateNostrKeypair();
      const bob = generateNostrKeypair();

      const aliceSigner = new PrivateKeySigner(alice.secretKey);
      const bobSigner = new PrivateKeySigner(bob.secretKey);

      const plaintext = 'Secret photo decryption key';
      const ciphertext = await aliceSigner.nip44Encrypt(bob.pubkey, plaintext);
      expect(ciphertext).not.toBe(plaintext);

      const decrypted = await bobSigner.nip44Decrypt(alice.pubkey, ciphertext);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('ReadOnlySigner', () => {
    it('returns configured pubkey and denies signing', async () => {
      const keypair = generateNostrKeypair();
      const signer = new ReadOnlySigner(keypair.pubkey);

      expect(signer.type).toBe('readOnly');
      const pubkey = await signer.getPublicKey();
      expect(pubkey).toBe(keypair.pubkey);

      await expect(signer.signEvent(sampleTemplate)).rejects.toThrow(
        /Cannot sign events in Read-Only mode/i,
      );
    });

    it('rejects invalid pubkey format in constructor', () => {
      expect(() => new ReadOnlySigner('invalid-pubkey')).toThrow();
    });
  });

  describe('Nip07Signer', () => {
    it('throws when window.nostr is missing', async () => {
      const signer = new Nip07Signer();
      expect(signer.type).toBe('nip07');

      // In Node environment, window.nostr is undefined
      await expect(signer.getPublicKey()).rejects.toThrow(/extension/i);
      await expect(signer.signEvent(sampleTemplate)).rejects.toThrow(
        /extension/i,
      );
    });

    it('delegates to window.nostr when available', async () => {
      const keypair = generateNostrKeypair();
      const mockNostr = {
        getPublicKey: vi.fn().mockResolvedValue(keypair.pubkey),
        signEvent: vi.fn().mockImplementation(async (tmpl) => ({
          ...tmpl,
          id: 'mock-id',
          pubkey: keypair.pubkey,
          sig: 'mock-sig',
        })),
      };

      // Mock window.nostr temporarily
      (
        globalThis as unknown as { window: { nostr: typeof mockNostr } }
      ).window = {
        nostr: mockNostr,
      };

      const signer = new Nip07Signer();
      const pubkey = await signer.getPublicKey();
      expect(pubkey).toBe(keypair.pubkey);

      const signed = await signer.signEvent(sampleTemplate);
      expect(signed.id).toBe('mock-id');
      expect(mockNostr.signEvent).toHaveBeenCalledWith(sampleTemplate);

      // Clean up mock
      delete (globalThis as unknown as { window?: unknown }).window;
    });
  });

  describe('Nip46Signer pairing session', () => {
    it('creates nostrconnect:// pairing URI with client pubkey and secret', () => {
      const session = Nip46Signer.createPairingSession([
        'wss://relay.emre.xyz',
      ]);
      expect(session.uri.startsWith('nostrconnect://')).toBe(true);
      expect(session.uri).toContain('relay=wss%3A%2F%2Frelay.emre.xyz');
      expect(session.uri).toContain('name=photo.emre.xyz');
      expect(session.clientPubkey).toHaveLength(64);
      expect(session.secret.length).toBeGreaterThan(0);
    });
  });
});

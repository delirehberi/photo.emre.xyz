import { describe, it, expect } from 'vitest';
import { finalizeEvent } from 'nostr-tools/pure';
import {
  isAdmin,
  createAdminChallenge,
  createAdminChallengeTemplate,
  verifyAdminChallenge,
} from '../../src/lib/nostr/admin';
import { ADMIN_PUBKEY } from '../../src/lib/nostr/config';
import { generateNostrKeypair } from '../../src/lib/nostr/keys';
import type { NostrEvent } from '../../src/lib/nostr/types';

describe('Admin Gatekeeper & Challenge-Response Authorization', () => {
  const adminKeypair = generateNostrKeypair();
  const nonAdminKeypair = generateNostrKeypair();

  describe('isAdmin', () => {
    it('returns true when pubkey matches configured admin pubkey', () => {
      expect(isAdmin(adminKeypair.pubkey, adminKeypair.pubkey)).toBe(true);
      expect(
        isAdmin(adminKeypair.pubkey.toUpperCase(), adminKeypair.pubkey),
      ).toBe(true);
    });

    it('returns false for unauthorized or malformed pubkeys', () => {
      expect(isAdmin(nonAdminKeypair.pubkey, adminKeypair.pubkey)).toBe(false);
      expect(isAdmin('', adminKeypair.pubkey)).toBe(false);
      expect(isAdmin(null, adminKeypair.pubkey)).toBe(false);
      expect(isAdmin(undefined, adminKeypair.pubkey)).toBe(false);
      expect(isAdmin('invalid-hex', adminKeypair.pubkey)).toBe(false);
    });

    it('checks default ADMIN_PUBKEY from config', () => {
      expect(isAdmin(ADMIN_PUBKEY)).toBe(true);
      expect(
        isAdmin(
          '0000000000000000000000000000000000000000000000000000000000000000',
        ),
      ).toBe(false);
    });
  });

  describe('createAdminChallenge', () => {
    it('creates timestamped challenge with expiration', () => {
      const challenge = createAdminChallenge('test-prefix', 120);
      expect(challenge.challenge.startsWith('test-prefix:')).toBe(true);
      expect(challenge.expiresAt).toBe(challenge.timestamp + 120);
    });
  });

  describe('verifyAdminChallenge', () => {
    it('verifies a valid signed challenge event from admin', () => {
      const challengeData = createAdminChallenge();
      const template = createAdminChallengeTemplate(challengeData.challenge);
      const signedEvent = finalizeEvent(template, adminKeypair.secretKey);

      const result = verifyAdminChallenge(
        signedEvent,
        challengeData.challenge,
        adminKeypair.pubkey,
      );

      expect(result.valid).toBe(true);
      expect(result.pubkey).toBe(adminKeypair.pubkey);
      expect(result.error).toBeUndefined();
    });

    it('rejects an event signed by non-admin identity', () => {
      const challengeData = createAdminChallenge();
      const template = createAdminChallengeTemplate(challengeData.challenge);
      const signedEvent = finalizeEvent(template, nonAdminKeypair.secretKey);

      const result = verifyAdminChallenge(
        signedEvent,
        challengeData.challenge,
        adminKeypair.pubkey,
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unauthorized pubkey');
    });

    it('rejects an event with mismatched challenge nonce', () => {
      const challengeData = createAdminChallenge();
      const template = createAdminChallengeTemplate('wrong-challenge-nonce');
      const signedEvent = finalizeEvent(template, adminKeypair.secretKey);

      const result = verifyAdminChallenge(
        signedEvent,
        challengeData.challenge,
        adminKeypair.pubkey,
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Challenge mismatch');
    });

    it('rejects an event with timestamp outside clock drift window', () => {
      const challengeData = createAdminChallenge();
      const template = createAdminChallengeTemplate(challengeData.challenge);
      // Event timestamp set to 1 hour in the past
      template.created_at = Math.floor(Date.now() / 1000) - 3600;
      const signedEvent = finalizeEvent(template, adminKeypair.secretKey);

      const result = verifyAdminChallenge(
        signedEvent,
        challengeData.challenge,
        adminKeypair.pubkey,
        120, // 120s max age
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired or out of allowed window');
    });

    it('rejects an event with invalid signature', () => {
      const challengeData = createAdminChallenge();
      const template = createAdminChallengeTemplate(challengeData.challenge);
      const signedEvent = finalizeEvent(template, adminKeypair.secretKey);

      // Corrupt signature
      const tamperedEvent: NostrEvent = {
        ...signedEvent,
        sig: 'bad' + signedEvent.sig.slice(3),
      };

      const result = verifyAdminChallenge(
        tamperedEvent,
        challengeData.challenge,
        adminKeypair.pubkey,
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('signature');
    });
  });
});

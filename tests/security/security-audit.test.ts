import { describe, it, expect } from 'vitest';
import { finalizeEvent, verifyEvent } from 'nostr-tools/pure';
import { escapeHtml, sanitizeText } from '../../src/lib/nostr/sanitizer';
import {
  createAdminChallenge,
  verifyAdminChallenge,
  createAdminChallengeTemplate,
} from '../../src/lib/nostr/admin';
import { generateNostrKeypair } from '../../src/lib/nostr/keys';
import { escapeXml } from '../../src/lib/media/watermark';
import type { NostrEvent } from '../../src/lib/nostr/types';

describe('Security & Cryptography Invariants Audit', () => {
  describe('XSS & Injection Sanitization', () => {
    it('escapes dangerous HTML characters (<, >, &, ", \') from user content', () => {
      const malicious = '<script>alert("xss")</script><p>Hello</p>';
      const sanitized = escapeHtml(malicious);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('&lt;script&gt;');
      expect(sanitized).toContain('&quot;xss&quot;');
    });

    it('sanitizes text content by stripping HTML tags', () => {
      const malicious = 'Event Title <script>stealCookies()</script>';
      const cleaned = sanitizeText(malicious);
      expect(cleaned).not.toContain('<script>');
      expect(cleaned).toBe('Event Title stealCookies()');
    });

    it('escapes XML/SVG entities in watermark strings to prevent SVG injection', () => {
      const malicious = '<text font-size="100">Hacked</text>&"\'';
      const escaped = escapeXml(malicious);
      expect(escaped).toBe(
        '&lt;text font-size=&quot;100&quot;&gt;Hacked&lt;/text&gt;&amp;&quot;&apos;',
      );
      expect(escaped).not.toContain('<text');
      expect(escaped).not.toContain('>');
    });
  });

  describe('Nostr Event Signature Verification', () => {
    it('accepts validly signed clean events', () => {
      const keypair = generateNostrKeypair();
      const template = {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: 'Authentic sovereign event',
      };
      const signed = finalizeEvent(template, keypair.secretKey);
      const cleanEvent: NostrEvent = {
        id: signed.id,
        pubkey: signed.pubkey,
        created_at: signed.created_at,
        kind: signed.kind,
        tags: signed.tags,
        content: signed.content,
        sig: signed.sig,
      };
      expect(verifyEvent(cleanEvent)).toBe(true);
    });

    it('rejects tampered event content on clean event copy', () => {
      const keypair = generateNostrKeypair();
      const template = {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: 'Original message',
      };
      const signed = finalizeEvent(template, keypair.secretKey);
      // Construct clean event with tampered content (preventing in-memory verifiedSymbol bypass)
      const tamperedEvent: NostrEvent = {
        id: signed.id,
        pubkey: signed.pubkey,
        created_at: signed.created_at,
        kind: signed.kind,
        tags: signed.tags,
        content: 'Tampered message',
        sig: signed.sig,
      };
      expect(verifyEvent(tamperedEvent)).toBe(false);
    });

    it('rejects tampered signature on clean event copy', () => {
      const keypair = generateNostrKeypair();
      const template = {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: 'Original message',
      };
      const signed = finalizeEvent(template, keypair.secretKey);
      const tamperedEvent: NostrEvent = {
        id: signed.id,
        pubkey: signed.pubkey,
        created_at: signed.created_at,
        kind: signed.kind,
        tags: signed.tags,
        content: signed.content,
        sig: '0'.repeat(128),
      };
      expect(verifyEvent(tamperedEvent)).toBe(false);
    });
  });

  describe('Admin Challenge-Response & Replay Attack Defense', () => {
    it('rejects challenges with expired timestamps beyond allowable clock drift', () => {
      const keypair = generateNostrKeypair();
      const challengeObj = createAdminChallenge();
      const template = createAdminChallengeTemplate(challengeObj.challenge);

      // Artificially age the event timestamp beyond 120s limit
      template.created_at = Math.floor(Date.now() / 1000) - 200;
      const signed = finalizeEvent(template, keypair.secretKey);

      const result = verifyAdminChallenge(
        signed,
        challengeObj.challenge,
        keypair.pubkey,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('rejects challenges with mismatched nonce', () => {
      const keypair = generateNostrKeypair();
      const challengeObj = createAdminChallenge();
      const wrongChallenge = 'photo-admin-challenge:wrong:nonce';
      const template = createAdminChallengeTemplate(wrongChallenge);
      const signed = finalizeEvent(template, keypair.secretKey);

      const result = verifyAdminChallenge(
        signed,
        challengeObj.challenge,
        keypair.pubkey,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Challenge mismatch');
    });
  });

  describe('Keypair Generation & Hygiene', () => {
    it('generates cryptographically secure 32-byte keys and valid npub/nsec bech32 formats', () => {
      const keypair = generateNostrKeypair();
      expect(keypair.secretKey.length).toBe(32);
      expect(keypair.pubkey).toMatch(/^[0-9a-f]{64}$/);
      expect(keypair.npub).toMatch(/^npub1[0-9a-z]+$/);
      expect(keypair.nsec).toMatch(/^nsec1[0-9a-z]+$/);
    });
  });
});

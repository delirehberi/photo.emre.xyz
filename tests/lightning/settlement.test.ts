import { describe, it, expect } from 'vitest';
import { finalizeEvent } from 'nostr-tools/pure';
import { generateNostrKeypair } from '../../src/lib/nostr/keys';
import { validateZapReceipt } from '../../src/lib/lightning/settlement';
import type { EventTemplate } from '../../src/lib/nostr/types';

describe('Zero-Database On-Relay Settlement Verifier', () => {
  const lnurlServiceKeypair = generateNostrKeypair();
  const payerKeypair = generateNostrKeypair();
  const sampleBolt11 =
    'lnbc100n1p3xxxxxxpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdp42ysxxatsyp3k7enxv4jsxqzpuaztrnwngzn3kcd5wpnvqldn8q6q3e5p9mm2j2q';
  const samplePreimage =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const sampleZapRequestId =
    'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';

  const sampleZapRequestJson = JSON.stringify({
    id: sampleZapRequestId,
    pubkey: payerKeypair.pubkey,
    kind: 9734,
    created_at: 1700000000,
    tags: [
      ['amount', '100000'], // 100 sats = 100,000 millisats
      ['action', 'create_organization'],
    ],
    content: 'Zap Request',
  });

  function createSignedReceipt(tagsOverride?: string[][], kindOverride = 9735) {
    const template: EventTemplate = {
      kind: kindOverride,
      created_at: Math.floor(Date.now() / 1000),
      tags: tagsOverride ?? [
        [
          'p',
          '46f3c7bb33cc3019049b76dc89dbb96e34c247bdda68b6ad8632682793ff8a1a',
        ],
        ['bolt11', sampleBolt11],
        ['description', sampleZapRequestJson],
        ['preimage', samplePreimage],
        ['e', sampleZapRequestId],
      ],
      content: '',
    };
    return finalizeEvent(template, lnurlServiceKeypair.secretKey);
  }

  it('validates a cryptographically sound Kind 9735 Zap Receipt', () => {
    const receipt = createSignedReceipt();
    const result = validateZapReceipt(receipt, {
      zapRequestId: sampleZapRequestId,
      bolt11: sampleBolt11,
      expectedAmountSats: 10, // lnbc100n = 10 sats in bolt11
    });

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.preimage).toBe(samplePreimage);
    expect(result.payerPubkey).toBe(payerKeypair.pubkey);
  });

  it('rejects events with invalid kind', () => {
    const receipt = createSignedReceipt(undefined, 1);
    const result = validateZapReceipt(receipt);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Expected event kind 9735');
  });

  it('rejects events with tampered signature', () => {
    const receipt = createSignedReceipt();
    const tampered = { ...receipt, content: 'tampered payload' };
    const result = validateZapReceipt(tampered);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid cryptographic signature');
  });

  it('rejects receipt when invoice does not match expected invoice', () => {
    const receipt = createSignedReceipt();
    const result = validateZapReceipt(receipt, {
      bolt11: 'lnbc999n1differentinvoice...',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invoice mismatch');
  });

  it('rejects receipt when zap request ID does not match', () => {
    const receipt = createSignedReceipt();
    const result = validateZapReceipt(receipt, {
      zapRequestId:
        '0000000000000000000000000000000000000000000000000000000000000000',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Zap request mismatch');
  });

  it('rejects receipt when settled amount is below expected sats', () => {
    const receipt = createSignedReceipt();
    // Receipt has lnbc100n = 10 sats
    const result = validateZapReceipt(receipt, {
      expectedAmountSats: 50,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Insufficient payment amount');
  });
});

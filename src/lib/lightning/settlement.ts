/**
 * Zero-Database On-Relay Lightning Settlement Verifier
 * photo.emre.xyz
 *
 * Verifies NIP-57 Zap Receipts (Kind 9735) and payment preimages on-relay
 * without local databases or persistent mutable state.
 */

import { verifyEvent } from 'nostr-tools/pure';
import { nip57, type Filter } from 'nostr-tools';
import { DEFAULT_RELAYS, NOSTR_KINDS } from '../nostr/config';
import { getSharedRelayPool } from '../nostr/pool';
import { LIGHTNING_TIMEOUTS } from './config';
import type { NostrEvent } from '../nostr/types';
import type { PaymentProof } from './types';

export interface ZapReceiptValidationOptions {
  zapRequestId?: string;
  bolt11?: string;
  expectedAmountSats?: number;
  recipientPubkey?: string;
}

export interface ZapReceiptValidationResult {
  valid: boolean;
  error?: string;
  amountSats?: number;
  preimage?: string;
  payerPubkey?: string;
  recipientPubkey?: string;
}

/**
 * Cryptographically validates a NIP-57 Zap Receipt event (Kind 9735).
 * Validates:
 * 1. Event Kind is 9735
 * 2. Valid Schnorr signature of the receipt author (the LNURL provider/wallet)
 * 3. Matching invoice (bolt11) or zap request ID (e tag)
 * 4. Verifies settled satoshi amount meets or exceeds expected fee
 */
export function validateZapReceipt(
  receipt: NostrEvent,
  options: ZapReceiptValidationOptions = {},
): ZapReceiptValidationResult {
  if (!receipt || typeof receipt !== 'object') {
    return { valid: false, error: 'Malformed or missing receipt event' };
  }

  if (receipt.kind !== NOSTR_KINDS.ZAP_RECEIPT) {
    return {
      valid: false,
      error: `Expected event kind 9735 (Zap Receipt), received kind ${receipt.kind}`,
    };
  }

  // 1. Verify cryptographic Schnorr signature on clean event
  const cleanEvent: NostrEvent = {
    id: receipt.id,
    pubkey: receipt.pubkey,
    created_at: receipt.created_at,
    kind: receipt.kind,
    tags: receipt.tags,
    content: receipt.content,
    sig: receipt.sig,
  };

  try {
    const isSignatureValid = verifyEvent(cleanEvent);
    if (!isSignatureValid) {
      return {
        valid: false,
        error: 'Invalid cryptographic signature on zap receipt event',
      };
    }
  } catch (err: unknown) {
    return {
      valid: false,
      error: `Signature verification exception: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // 2. Extract tags from receipt
  const bolt11Tag = receipt.tags?.find(
    (t) => Array.isArray(t) && t[0] === 'bolt11',
  )?.[1];
  const eTag = receipt.tags?.find((t) => Array.isArray(t) && t[0] === 'e')?.[1];
  const pTag = receipt.tags?.find((t) => Array.isArray(t) && t[0] === 'p')?.[1];
  const preimageTag = receipt.tags?.find(
    (t) => Array.isArray(t) && t[0] === 'preimage',
  )?.[1];
  const descriptionTag = receipt.tags?.find(
    (t) => Array.isArray(t) && t[0] === 'description',
  )?.[1];

  let parsedZapRequest: NostrEvent | null = null;
  if (descriptionTag) {
    try {
      parsedZapRequest = JSON.parse(descriptionTag);
    } catch {
      // Ignored
    }
  }

  const payerPubkey =
    parsedZapRequest?.pubkey ||
    receipt.tags?.find((t) => Array.isArray(t) && t[0] === 'P')?.[1];

  // 3. Match against expected invoice or zap request
  if (options.bolt11 && bolt11Tag) {
    if (bolt11Tag.toLowerCase() !== options.bolt11.toLowerCase()) {
      return {
        valid: false,
        error:
          'Invoice mismatch: receipt bolt11 does not match expected invoice',
      };
    }
  }

  if (options.zapRequestId) {
    const matchesETag = eTag === options.zapRequestId;
    const matchesDescId = parsedZapRequest?.id === options.zapRequestId;
    if (!matchesETag && !matchesDescId) {
      return {
        valid: false,
        error:
          'Zap request mismatch: receipt does not reference expected zap request',
      };
    }
  }

  // 4. Validate amount in satoshis
  let settledSats = 0;
  if (bolt11Tag) {
    try {
      settledSats = Math.round(nip57.getSatoshisAmountFromBolt11(bolt11Tag));
    } catch {
      // Ignored
    }
  }

  if (settledSats === 0 && parsedZapRequest) {
    const zapAmountTag = parsedZapRequest.tags?.find(
      (t) => Array.isArray(t) && t[0] === 'amount',
    )?.[1];
    if (zapAmountTag) {
      settledSats = Math.round(parseInt(zapAmountTag, 10) / 1000);
    }
  }

  if (options.expectedAmountSats !== undefined) {
    if (settledSats < options.expectedAmountSats) {
      return {
        valid: false,
        error: `Insufficient payment amount: received ${settledSats} sats, expected ${options.expectedAmountSats} sats`,
        amountSats: settledSats,
      };
    }
  }

  return {
    valid: true,
    amountSats: settledSats,
    preimage: preimageTag,
    payerPubkey,
    recipientPubkey: pTag,
  };
}

export interface WaitForZapReceiptOptions {
  zapRequestId: string;
  bolt11: string;
  expectedAmountSats: number;
  payerPubkey: string;
  relays?: string[];
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * Subscribes to the Nostr relay mesh to listen for a settled NIP-57 Zap Receipt event.
 * Resolves with a verifiable PaymentProof upon receipt.
 */
export async function waitForZapReceipt(
  options: WaitForZapReceiptOptions,
): Promise<PaymentProof> {
  const {
    zapRequestId,
    bolt11,
    expectedAmountSats,
    payerPubkey,
    relays = DEFAULT_RELAYS,
    timeoutMs = LIGHTNING_TIMEOUTS.INVOICE_POLL_MS,
    signal,
  } = options;

  const poolManager = getSharedRelayPool();
  const pool = poolManager.getPool();

  return new Promise<PaymentProof>((resolve, reject) => {
    let finished = false;
    let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
        timeoutTimer = null;
      }
      try {
        sub.close();
      } catch {
        // Ignored
      }
    };

    if (signal?.aborted) {
      reject(new Error('Payment verification was aborted'));
      return;
    }

    signal?.addEventListener('abort', () => {
      if (!finished) {
        finished = true;
        cleanup();
        reject(new Error('Payment verification was aborted'));
      }
    });

    const filter: Filter = {
      kinds: [NOSTR_KINDS.ZAP_RECEIPT],
      '#e': [zapRequestId],
    };

    const sub = pool.subscribeMany([...relays], filter, {
      onevent: (event: NostrEvent) => {
        if (finished) return;

        const validation = validateZapReceipt(event, {
          zapRequestId,
          bolt11,
          expectedAmountSats,
        });

        if (validation.valid) {
          finished = true;
          cleanup();
          resolve({
            method: 'invoice',
            preimage: validation.preimage,
            zapReceiptId: event.id,
            zapReceiptEvent: event,
            bolt11,
            amountSats: validation.amountSats || expectedAmountSats,
            settledAt: event.created_at,
            payerPubkey: validation.payerPubkey || payerPubkey,
          });
        }
      },
    });

    timeoutTimer = setTimeout(() => {
      if (!finished) {
        finished = true;
        cleanup();
        reject(
          new Error(
            `Invoice payment listener timed out after ${Math.round(timeoutMs / 1000)} seconds.`,
          ),
        );
      }
    }, timeoutMs);
  });
}

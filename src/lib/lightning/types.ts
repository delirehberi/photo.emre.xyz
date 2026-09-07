/**
 * Lightning Monetization & Settlement Type Definitions
 * photo.emre.xyz
 */

import type { NostrEvent } from '../nostr/types';

/**
 * Monetized action types supported by the platform.
 */
export type MonetizedAction =
  'create_organization' | 'create_album' | 'upload_image';

/**
 * Pricing and quote breakdown for an action.
 */
export interface FeeQuote {
  /** Target action name */
  action: MonetizedAction;
  /** Quantity of units (e.g. number of images) */
  quantity: number;
  /** Unit fee in satoshis */
  unitFeeSats: number;
  /** Total fee in satoshis (0 if exempt) */
  totalSats: number;
  /** Whether the fee was bypassed (e.g., administrator exemption) */
  isExempt: boolean;
  /** Human-readable explanation of the fee */
  description: string;
}

/**
 * Supported payment channels/methods.
 */
export type PaymentMethod = 'webln' | 'nwc' | 'invoice';

/**
 * Lifecycle status of a payment flow.
 */
export type PaymentStatus =
  | 'idle'
  | 'generating'
  | 'pending'
  | 'verifying'
  | 'settled'
  | 'failed'
  | 'bypassed';

/**
 * Cryptographic settlement proof.
 */
export interface PaymentProof {
  /** Method through which the payment settled */
  method: PaymentMethod | 'admin_bypass' | 'test_mode';
  /** BOLT-11 payment preimage (if paid via WebLN or NWC) */
  preimage?: string;
  /** NIP-57 Zap Receipt event ID (if paid via LNURL/invoice on-relay) */
  zapReceiptId?: string;
  /** Raw Zap Receipt Nostr Event (Kind 9735) */
  zapReceiptEvent?: NostrEvent;
  /** Original BOLT-11 invoice string */
  bolt11?: string;
  /** Satoshi amount confirmed paid */
  amountSats: number;
  /** UNIX timestamp of payment settlement */
  settledAt: number;
  /** Public key of the payer */
  payerPubkey: string;
}

/**
 * WebLN Provider Interfaces (Standard WebLN specification)
 */
export interface WebLNSendPaymentResponse {
  preimage: string;
  paymentHash?: string;
  route?: unknown;
}

export interface WebLNProvider {
  enable(): Promise<void>;
  sendPayment(paymentRequest: string): Promise<WebLNSendPaymentResponse>;
  getInfo?(): Promise<{
    node?: {
      alias?: string;
      pubkey?: string;
    };
    methods?: string[];
  }>;
}

declare global {
  interface Window {
    webln?: WebLNProvider;
  }
}

/**
 * NIP-47 (NWC) Connection parameters
 */
export interface NWCConnectionConfig {
  /** Wallet service public key (hex) */
  walletPubkey: string;
  /** Relay URL where wallet listens */
  relayUrl: string;
  /** Client secret key (hex) for authenticating requests */
  secret: string;
  /** Optional LUD-16 address */
  lud16?: string;
}

/**
 * LNURL-pay endpoint metadata (LUD-06 / LUD-16)
 */
export interface LNURLPayMetadata {
  callback: string;
  maxSendable: number;
  minSendable: number;
  metadata: string;
  tag: string;
  allowsNostr?: boolean;
  nostrPubkey?: string;
}

/**
 * Parameters to create a zap invoice
 */
export interface CreateZapInvoiceParams {
  amountSats: number;
  action: MonetizedAction;
  memo: string;
  recipientLud16?: string;
  payerPubkey: string;
  relays?: string[];
}

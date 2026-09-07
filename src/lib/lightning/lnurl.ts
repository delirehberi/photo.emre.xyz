/**
 * LNURL-pay & NIP-57 Zap Request Generator
 * photo.emre.xyz
 *
 * Resolves LUD-16 endpoints, signs NIP-57 zap requests with active signer,
 * fetches BOLT-11 invoices, and renders high-contrast QR codes.
 */

import QRCode from 'qrcode';
import { bech32 } from '@scure/base';
import { ADMIN_PUBKEY, DEFAULT_RELAYS } from '../nostr/config';
import type { EventTemplate, NostrEvent } from '../nostr/types';
import type { NostrSigner } from '../nostr/signer/types';
import { PLATFORM_LUD16 } from './config';
import type { LNURLPayMetadata, MonetizedAction } from './types';

/**
 * Decodes a bech32-encoded LNURL string into its original HTTPS endpoint URL.
 */
export function decodeLnurl(lnurl: string): string {
  const clean = lnurl.trim();
  if (clean.toLowerCase().startsWith('lnurl1')) {
    const { words } = bech32.decode(
      clean.toLowerCase() as `${string}1${string}`,
      2000,
    );
    const bytes = bech32.fromWords(words);
    return new TextDecoder().decode(Uint8Array.from(bytes));
  }
  return clean;
}

/**
 * Transforms a Lightning Address (LUD-16: user@domain.com) or bech32 LNURL (LUD-06)
 * into its LNURL-pay endpoint URL.
 */
export function getLnurlPayUrl(addressOrLnurl: string): string {
  const clean = addressOrLnurl.trim();
  if (clean.toLowerCase().startsWith('lnurl1')) {
    return decodeLnurl(clean);
  }
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }

  const parts = clean.toLowerCase().split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(
      `Invalid Lightning Address format: "${addressOrLnurl}". Expected format: user@domain.com or lnurl1...`,
    );
  }

  const [username, domain] = parts;
  return `https://${domain}/.well-known/lnurlp/${username}`;
}

/**
 * Resolves LNURL-pay metadata from a given LUD-16 address.
 */
export async function resolveLnurlEndpoint(
  lud16: string = PLATFORM_LUD16,
): Promise<LNURLPayMetadata> {
  const url = getLnurlPayUrl(lud16);

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(
      `LNURL-pay resolution failed for ${lud16}: HTTP ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as Partial<LNURLPayMetadata> & {
    status?: string;
    reason?: string;
  };

  if (data.status === 'ERROR') {
    throw new Error(
      `LNURL provider error for ${lud16}: ${data.reason || 'Unknown error'}`,
    );
  }

  if (!data.callback || typeof data.callback !== 'string') {
    throw new Error(
      `LNURL metadata response missing "callback" URL for ${lud16}`,
    );
  }

  if (
    typeof data.minSendable !== 'number' ||
    typeof data.maxSendable !== 'number'
  ) {
    throw new Error(
      `LNURL metadata response missing sendable limits for ${lud16}`,
    );
  }

  return {
    callback: data.callback,
    minSendable: data.minSendable,
    maxSendable: data.maxSendable,
    metadata: data.metadata || '',
    tag: data.tag || 'payRequest',
    allowsNostr: Boolean(data.allowsNostr),
    nostrPubkey: data.nostrPubkey,
  };
}

export interface ZapRequestTemplateParams {
  amountSats: number;
  action: MonetizedAction;
  recipientPubkey: string;
  lnurlEndpoint: string;
  memo?: string;
  relays?: readonly string[] | string[];
}

/**
 * Crafts an unsigned NIP-57 Zap Request (Kind 9734) EventTemplate.
 * Strictly binds the requested action and amount.
 */
export function createZapRequestTemplate(
  params: ZapRequestTemplateParams,
): EventTemplate {
  const {
    amountSats,
    action,
    recipientPubkey,
    lnurlEndpoint,
    memo = `photo.emre.xyz payment for ${action}`,
    relays = DEFAULT_RELAYS,
  } = params;

  const amountMillisats = Math.round(amountSats * 1000);

  return {
    kind: 9734,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['relays', ...relays],
      ['amount', amountMillisats.toString()],
      ['lnurl', lnurlEndpoint],
      ['p', recipientPubkey],
      ['action', action],
    ],
    content: memo,
  };
}

export interface FetchZapInvoiceParams {
  signer: NostrSigner;
  amountSats: number;
  action: MonetizedAction | string;
  recipientLud16?: string;
  recipientPubkey?: string;
  memo?: string;
  relays?: readonly string[] | string[];
}

export interface ZapInvoiceResult {
  bolt11: string;
  zapRequest: NostrEvent;
  amountSats: number;
  recipientLud16: string;
}

/**
 * Creates and signs a NIP-57 zap request with the user's active signer,
 * calls the LNURL callback, and retrieves the BOLT-11 payment request.
 */
export async function createZapInvoice(
  params: FetchZapInvoiceParams,
): Promise<ZapInvoiceResult> {
  const {
    signer,
    amountSats,
    action,
    recipientLud16 = PLATFORM_LUD16,
    recipientPubkey: paramRecipientPubkey,
    memo,
    relays = DEFAULT_RELAYS,
  } = params;

  if (!signer || signer.type === 'readOnly') {
    throw new Error(
      'An active authenticated Nostr signer is required to generate a payment invoice.',
    );
  }

  // 1. Resolve LNURL-pay metadata
  const metadata = await resolveLnurlEndpoint(recipientLud16);
  const amountMillisats = Math.round(amountSats * 1000);

  if (amountMillisats < metadata.minSendable) {
    throw new Error(
      `Amount (${amountSats} sats) is below recipient minimum sendable limit (${metadata.minSendable / 1000} sats)`,
    );
  }

  if (amountMillisats > metadata.maxSendable) {
    throw new Error(
      `Amount (${amountSats} sats) exceeds recipient maximum sendable limit (${metadata.maxSendable / 1000} sats)`,
    );
  }

  const lnurlEndpoint = getLnurlPayUrl(recipientLud16);
  const recipientPubkey =
    paramRecipientPubkey || metadata.nostrPubkey || ADMIN_PUBKEY;

  // 2. Craft & sign Kind 9734 Zap Request
  const template = createZapRequestTemplate({
    amountSats,
    action: action as MonetizedAction,
    recipientPubkey,
    lnurlEndpoint,
    memo,
    relays,
  });

  const signedZapRequest = await signer.signEvent(template);

  // 3. Request invoice from callback
  const callbackUrl = new URL(metadata.callback);
  callbackUrl.searchParams.set('amount', amountMillisats.toString());
  callbackUrl.searchParams.set('nostr', JSON.stringify(signedZapRequest));

  const callbackRes = await fetch(callbackUrl.toString(), {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!callbackRes.ok) {
    throw new Error(
      `Failed to fetch invoice from LNURL callback: HTTP ${callbackRes.status} ${callbackRes.statusText}`,
    );
  }

  interface CallbackResponseData {
    status?: string;
    reason?: string;
    pr?: string;
  }

  const callbackData = (await callbackRes.json()) as CallbackResponseData;

  if (callbackData.status === 'ERROR') {
    throw new Error(
      `LNURL callback returned error: ${callbackData.reason || 'Unknown error'}`,
    );
  }

  if (!callbackData.pr || typeof callbackData.pr !== 'string') {
    throw new Error(
      'LNURL callback did not return a valid BOLT-11 invoice (pr)',
    );
  }

  return {
    bolt11: callbackData.pr,
    zapRequest: signedZapRequest,
    amountSats,
    recipientLud16,
  };
}

/**
 * Generates an SVG or PNG data URL for rendering a BOLT-11 invoice QR code.
 */
export async function generateInvoiceQrDataUrl(
  bolt11: string,
  width = 280,
): Promise<string> {
  const clean = bolt11.trim();
  if (!clean) {
    throw new Error('Cannot generate QR code for empty invoice');
  }

  return QRCode.toDataURL(clean.toUpperCase(), {
    margin: 2,
    width,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });
}

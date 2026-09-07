/**
 * NIP-47 (Nostr Wallet Connect) Client
 * photo.emre.xyz
 *
 * Implements NIP-47 client requests for instant background Lightning settlement.
 */

import { nip47, nip04, type Filter } from 'nostr-tools';
import { getPublicKey } from 'nostr-tools/pure';
import { hexToBytes, isHex32 } from 'nostr-tools/utils';
import { getSharedRelayPool } from '../nostr/pool';
import { LIGHTNING_TIMEOUTS, NWC_STORAGE_KEY } from './config';
import type { NWCConnectionConfig } from './types';
import type { NostrEvent } from '../nostr/types';

/**
 * Parses and validates a NIP-47 connection URI string.
 * Format: nostr+walletconnect://<wallet-pubkey>?relay=<relay>&secret=<secret>&lud16=<lud16>
 */
export function parseNWCUrl(uri: string): NWCConnectionConfig {
  const cleanUri = uri.trim();
  if (!cleanUri) {
    throw new Error('NWC connection string is empty');
  }

  if (!cleanUri.startsWith('nostr+walletconnect://')) {
    throw new Error(
      'Invalid NWC connection URI scheme. Must start with nostr+walletconnect://',
    );
  }

  try {
    const parsed = nip47.parseConnectionString(cleanUri);

    if (!parsed.pubkey || !isHex32(parsed.pubkey)) {
      throw new Error(
        'Invalid or missing wallet pubkey in NWC connection string',
      );
    }

    if (!parsed.secret || !isHex32(parsed.secret)) {
      throw new Error('Invalid or missing secret key in NWC connection string');
    }

    const relayUrl =
      (Array.isArray(parsed.relays) && parsed.relays[0]) ||
      (parsed as unknown as { relay?: string }).relay;
    if (!relayUrl || !relayUrl.startsWith('ws')) {
      throw new Error('Invalid or missing relay URL in NWC connection string');
    }

    // Extract optional lud16 if present in URL
    let lud16: string | undefined;
    try {
      const urlObj = new URL(
        cleanUri.replace('nostr+walletconnect://', 'http://'),
      );
      const queryLud16 = urlObj.searchParams.get('lud16');
      if (queryLud16 && queryLud16.includes('@')) {
        lud16 = queryLud16.trim();
      }
    } catch {
      // Ignored, lud16 is optional
    }

    return {
      walletPubkey: parsed.pubkey,
      relayUrl,
      secret: parsed.secret,
      lud16,
    };
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`Failed to parse NWC connection URI: ${String(err)}`);
  }
}

const memoryFallbackStorage: Record<string, string> = {};

function getStorage(): {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
} | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (
    typeof globalThis !== 'undefined' &&
    'localStorage' in globalThis &&
    globalThis.localStorage
  ) {
    return globalThis.localStorage;
  }
  return {
    getItem: (k: string) => memoryFallbackStorage[k] ?? null,
    setItem: (k: string, v: string) => {
      memoryFallbackStorage[k] = v;
    },
    removeItem: (k: string) => {
      delete memoryFallbackStorage[k];
    },
  };
}

/**
 * Retrieves the stored NWC connection from local storage, if present and valid.
 */
export function getStoredNWC(): NWCConnectionConfig | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(NWC_STORAGE_KEY);
    if (!raw) return null;
    return parseNWCUrl(raw);
  } catch {
    return null;
  }
}

/**
 * Stores a validated NWC connection URI string in local storage.
 */
export function storeNWC(uri: string): NWCConnectionConfig {
  const config = parseNWCUrl(uri);
  const storage = getStorage();
  if (storage) {
    storage.setItem(NWC_STORAGE_KEY, uri.trim());
  }
  return config;
}

/**
 * Removes the stored NWC connection from local storage.
 */
export function clearStoredNWC(): void {
  const storage = getStorage();
  if (storage) {
    storage.removeItem(NWC_STORAGE_KEY);
  }
}

export interface NWCPaymentResult {
  preimage: string;
  responseEvent: NostrEvent;
}

/**
 * Pays a BOLT-11 invoice using an active NWC connection.
 * Sends encrypted Kind 23194 request to wallet relay and awaits Kind 23195 response.
 */
export async function payWithNWC(
  config: NWCConnectionConfig,
  invoice: string,
  timeoutMs: number = LIGHTNING_TIMEOUTS.NWC_REQUEST_MS,
): Promise<NWCPaymentResult> {
  const cleanInvoice = invoice.trim();
  if (!cleanInvoice) {
    throw new Error('BOLT-11 invoice string is empty');
  }

  const secretBytes = hexToBytes(config.secret);
  const clientPubkey = getPublicKey(secretBytes);

  // 1. Craft and finalize NIP-47 request event (Kind 23194)
  const requestEvent = await nip47.makeNwcRequestEvent(
    config.walletPubkey,
    secretBytes,
    cleanInvoice,
  );

  const poolManager = getSharedRelayPool();
  const pool = poolManager.getPool();

  return new Promise<NWCPaymentResult>((resolve, reject) => {
    let resolved = false;
    let cleanupTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (cleanupTimer) {
        clearTimeout(cleanupTimer);
        cleanupTimer = null;
      }
      try {
        sub.close();
      } catch {
        // Ignored
      }
    };

    // 2. Subscribe to Kind 23195 response tagged with request event ID
    const filter: Filter = {
      kinds: [23195],
      '#p': [clientPubkey],
      '#e': [requestEvent.id],
    };

    const sub = pool.subscribeMany([config.relayUrl], filter, {
      onevent: async (event: NostrEvent) => {
        if (resolved) return;

        try {
          // Decrypt response content using client secret key and wallet pubkey
          const decryptedContent = nip04.decrypt(
            secretBytes,
            config.walletPubkey,
            event.content,
          );

          interface NwcPayResponsePayload {
            result_type?: string;
            result?: {
              preimage?: string;
            };
            error?: {
              code?: string;
              message?: string;
            };
          }

          const payload: NwcPayResponsePayload = JSON.parse(decryptedContent);

          if (payload.error) {
            resolved = true;
            cleanup();
            reject(
              new Error(
                payload.error.message ||
                  `NWC Error (${payload.error.code || 'UNKNOWN'})`,
              ),
            );
            return;
          }

          if (!payload.result?.preimage) {
            resolved = true;
            cleanup();
            reject(new Error('NWC response did not include payment preimage'));
            return;
          }

          resolved = true;
          cleanup();
          resolve({
            preimage: payload.result.preimage,
            responseEvent: event,
          });
        } catch (err: unknown) {
          resolved = true;
          cleanup();
          reject(
            new Error(
              `Failed to decrypt or parse NWC response: ${err instanceof Error ? err.message : String(err)}`,
            ),
          );
        }
      },
    });

    // 3. Publish request event to wallet relay
    poolManager
      .publishEvent(requestEvent, [config.relayUrl])
      .then(({ successfulRelays }) => {
        if (!successfulRelays.includes(config.relayUrl)) {
          resolved = true;
          cleanup();
          reject(
            new Error(
              `Failed to dispatch NWC request to wallet relay: ${config.relayUrl}`,
            ),
          );
        }
      })
      .catch((err) => {
        resolved = true;
        cleanup();
        reject(err);
      });

    // 4. Set timeout
    cleanupTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        reject(
          new Error(
            `NWC payment timed out after ${Math.round(timeoutMs / 1000)} seconds. Wallet did not respond.`,
          ),
        );
      }
    }, timeoutMs);
  });
}

/**
 * Nostr Relay Mesh Connection Pool & Multi-Relay Query Engine
 * photo.emre.xyz
 */

import './safe-websocket';
import { SimplePool } from 'nostr-tools/pool';
import type { Filter } from 'nostr-tools/filter';
import { verifyEvent } from 'nostr-tools/pure';
import { DEFAULT_RELAYS, RELAY_TIMEOUTS } from './config';
import type { NostrEvent, QueryOptions } from './types';

export class RelayPoolManager {
  private pool: SimplePool;

  constructor(customPool?: SimplePool) {
    this.pool = customPool || new SimplePool();
  }

  /**
   * Access the underlying SimplePool instance.
   */
  public getPool(): SimplePool {
    return this.pool;
  }

  /**
   * Queries the relay mesh in parallel with timeout deduplication.
   * Merges and deduplicates events by event ID across all responding relays.
   *
   * @param relays Target relay URLs (defaults to DEFAULT_RELAYS)
   * @param filter Nostr subscription filter
   * @param options Query configuration options (timeout, signature verification)
   * @returns Array of deduplicated, verified NostrEvent objects
   */
  public async queryEvents(
    relays: readonly string[] = DEFAULT_RELAYS,
    filter: Filter,
    options: QueryOptions = {},
  ): Promise<NostrEvent[]> {
    const timeoutMs = options.timeoutMs ?? RELAY_TIMEOUTS.QUERY;
    const verifySignatures = options.verifySignatures ?? true;

    const relayUrls = Array.from(relays);
    if (relayUrls.length === 0) {
      return [];
    }

    try {
      const queryPromise = this.pool.querySync(relayUrls, filter);
      const timeoutPromise = new Promise<NostrEvent[]>((resolve) => {
        const timer = setTimeout(() => {
          clearTimeout(timer);
          resolve([]);
        }, timeoutMs);
      });

      // Race between the relay query and timeout cutoff
      const rawEvents = await Promise.race([queryPromise, timeoutPromise]);

      // Deduplicate by event ID and optionally verify signatures
      const eventMap = new Map<string, NostrEvent>();

      for (const event of rawEvents) {
        if (!event || !event.id) continue;
        if (eventMap.has(event.id)) continue;

        if (verifySignatures) {
          try {
            if (!verifyEvent(event)) {
              continue;
            }
          } catch {
            continue;
          }
        }

        eventMap.set(event.id, event);
      }

      return Array.from(eventMap.values());
    } catch {
      // Gracefully return empty array on catastrophic network or pool failure
      return [];
    }
  }

  /**
   * Fetches a single event matching the filter from the relay mesh.
   * Useful for fetching replaceable events (e.g. Kind 0 Profile or Kind 31922 Event Album).
   *
   * @param relays Target relay URLs (defaults to DEFAULT_RELAYS)
   * @param filter Nostr subscription filter
   * @param options Query options
   * @returns The matching NostrEvent or null if not found
   */
  public async queryOne(
    relays: readonly string[] = DEFAULT_RELAYS,
    filter: Filter,
    options: QueryOptions = {},
  ): Promise<NostrEvent | null> {
    const timeoutMs = options.timeoutMs ?? RELAY_TIMEOUTS.QUERY;
    const verifySignatures = options.verifySignatures ?? true;

    const relayUrls = Array.from(relays);
    if (relayUrls.length === 0) {
      return null;
    }

    try {
      const getPromise = this.pool.get(relayUrls, filter);
      const timeoutPromise = new Promise<null>((resolve) => {
        const timer = setTimeout(() => {
          clearTimeout(timer);
          resolve(null);
        }, timeoutMs);
      });

      const event = await Promise.race([getPromise, timeoutPromise]);
      if (!event) {
        return null;
      }

      if (verifySignatures) {
        try {
          if (!verifyEvent(event)) {
            return null;
          }
        } catch {
          return null;
        }
      }

      return event;
    } catch {
      return null;
    }
  }

  /**
   * Broadcasts a signed event concurrently across the configured relay mesh.
   * Tracks successes and failures per relay with a timeout threshold.
   *
   * @param event Signed Nostr event
   * @param relays Target relay URLs (defaults to DEFAULT_RELAYS)
   * @param timeoutMs Timeout in milliseconds for publishing acknowledgements
   */
  public async publishEvent(
    event: NostrEvent,
    relays: readonly string[] = DEFAULT_RELAYS,
    timeoutMs = RELAY_TIMEOUTS.PUBLISH,
  ): Promise<{ successfulRelays: string[]; failedRelays: string[] }> {
    const relayUrls = Array.from(relays);
    if (relayUrls.length === 0) {
      return { successfulRelays: [], failedRelays: [] };
    }

    const successfulRelays: string[] = [];
    const failedRelays: string[] = [];

    const publishPromises = this.pool.publish(relayUrls, event);

    // Each publish promise resolves or rejects per relay
    const settled = await Promise.allSettled(
      publishPromises.map(async (p, idx) => {
        const relay = relayUrls[idx] || `relay-${idx}`;
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Publish timeout')), timeoutMs),
        );
        await Promise.race([p, timeout]);
        return relay;
      }),
    );

    settled.forEach((result, idx) => {
      const relay = relayUrls[idx] || `relay-${idx}`;
      if (result.status === 'fulfilled') {
        successfulRelays.push(relay);
      } else {
        failedRelays.push(relay);
      }
    });

    return { successfulRelays, failedRelays };
  }

  /**
   * Closes all active connections and cleans up the pool.
   */
  public close(relays: readonly string[] = DEFAULT_RELAYS): void {
    try {
      this.pool.close(Array.from(relays));
    } catch {
      // Ignore errors on pool close
    }
  }

  /**
   * Destroys the pool completely.
   */
  public destroy(): void {
    try {
      this.pool.destroy();
    } catch {
      // Ignore errors on pool destroy
    }
  }
}

/**
 * Singleton instance for shared application use.
 */
let sharedRelayPool: RelayPoolManager | null = null;

export function getSharedRelayPool(): RelayPoolManager {
  if (!sharedRelayPool) {
    sharedRelayPool = new RelayPoolManager();
  }
  return sharedRelayPool;
}

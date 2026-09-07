import { describe, it, expect } from 'vitest';
import { SafeWebSocket } from '../../src/lib/nostr/safe-websocket';
import { SimplePool } from 'nostr-tools/pool';

describe('SafeWebSocket', () => {
  it('instantiates and guards against duplicate close() calls', () => {
    // Connect to invalid loopback address that refuses connection
    const ws = new SafeWebSocket('ws://127.0.0.1:59999');
    expect(ws).toBeDefined();

    // Calling close multiple times should not throw
    expect(() => {
      ws.close();
      ws.close();
      ws.close();
    }).not.toThrow();
  });

  it('prevents infinite recursion when close() is invoked inside onerror', async () => {
    const ws = new SafeWebSocket('ws://127.0.0.1:59998');

    let errorCount = 0;
    await new Promise<void>((resolve) => {
      ws.onerror = () => {
        errorCount++;
        expect(() => {
          ws.close();
        }).not.toThrow();
        // Allow event loop to process
        setTimeout(resolve, 50);
      };

      // In environments where network fails immediately or timeouts
      setTimeout(resolve, 300);
    });

    // Should not have exploded the call stack
    expect(errorCount).toBeLessThan(10);
  });

  it('allows SimplePool to query an unreachable relay without Maximum call stack size exceeded', async () => {
    const pool = new SimplePool();
    // Querying an unreachable address should reject or resolve empty array without RangeError
    let threwRangeError = false;
    try {
      const results = await pool.querySync(['ws://127.0.0.1:59997'], {
        kinds: [1],
      });
      expect(Array.isArray(results)).toBe(true);
    } catch (err: unknown) {
      if (err instanceof RangeError) {
        threwRangeError = true;
      }
    }

    expect(threwRangeError).toBe(false);
  });
});

/**
 * Safe WebSocket Implementation
 * photo.emre.xyz
 *
 * Fixes Node.js 22 (undici) infinite recursion bug:
 * In Node 22, calling ws.close() inside ws.onerror synchronously re-dispatches
 * onerror, causing an immediate RangeError: Maximum call stack size exceeded.
 *
 * SafeWebSocket guards against re-entrant close() calls and ensures clean termination.
 */

import { useWebSocketImplementation } from 'nostr-tools/pool';

const BaseWebSocket: typeof WebSocket =
  typeof WebSocket !== 'undefined'
    ? WebSocket
    : (class {} as unknown as typeof WebSocket);

export class SafeWebSocket extends BaseWebSocket {
  private _isClosing = false;
  private _isClosed = false;

  constructor(url: string | URL, protocols?: string | string[]) {
    if (typeof WebSocket === 'undefined') {
      throw new Error(
        'WebSocket implementation is not available in this runtime',
      );
    }
    super(url, protocols);
  }

  public override close(code?: number, reason?: string): void {
    if (this._isClosing || this._isClosed) {
      return;
    }
    this._isClosing = true;

    try {
      super.close(code, reason);
    } catch {
      // Suppress synchronous close errors when socket is already broken
    } finally {
      this._isClosed = true;
    }
  }
}

// Automatically register SafeWebSocket with nostr-tools
if (typeof WebSocket !== 'undefined') {
  try {
    useWebSocketImplementation(SafeWebSocket);
  } catch {
    // Ignore if not supported in environment
  }
}

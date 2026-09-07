/**
 * Edge Cache Invalidation Endpoint
 * photo.emre.xyz
 *
 * Route: POST /api/cache/invalidate
 * Instantly invalidates Cloudflare Edge cache entries for albums, paths,
 * and media download routes upon publishing new Nostr events.
 */

import type { APIRoute } from 'astro';
import { verifyEvent } from 'nostr-tools/pure';
import { isAdmin } from '../../../lib/nostr/admin';
import { ADMIN_CHALLENGE_TIMEOUT_SECONDS } from '../../../lib/nostr/config';
import {
  getSharedEdgeCache,
  normalizeCacheKey,
} from '../../../lib/cache/edge-cache';
import type { NostrEvent } from '../../../lib/nostr/types';

export const prerender = false;

interface InvalidatePayload {
  coordinate?: string;
  slug?: string;
  paths?: string[];
  hashes?: string[];
  authEvent?: NostrEvent;
}

/**
 * Extracts authorization event from Authorization header or payload.
 */
function extractAuthEvent(
  authHeader: string | null,
  payloadEvent?: NostrEvent,
): NostrEvent | null {
  if (payloadEvent && typeof payloadEvent === 'object') {
    return payloadEvent;
  }

  if (authHeader && authHeader.startsWith('Nostr ')) {
    try {
      const base64 = authHeader.slice(6).trim();
      const decoded = atob(base64);
      return JSON.parse(decoded) as NostrEvent;
    } catch {
      return null;
    }
  }

  return null;
}

export const POST: APIRoute = async ({ request }) => {
  let body: InvalidatePayload;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON request body' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const authHeader = request.headers.get('Authorization');
  const authEvent = extractAuthEvent(authHeader, body.authEvent);

  // 1. Verify caller authorization
  if (!authEvent) {
    return new Response(
      JSON.stringify({
        error:
          'Missing authorization: signed Nostr event or NIP-98 header required',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  // 2. Cryptographic signature check
  const cleanEvent: NostrEvent = {
    id: authEvent.id,
    pubkey: authEvent.pubkey,
    created_at: authEvent.created_at,
    kind: authEvent.kind,
    tags: authEvent.tags,
    content: authEvent.content,
    sig: authEvent.sig,
  };

  try {
    if (!verifyEvent(cleanEvent)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid cryptographic signature on auth event',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
  } catch {
    return new Response(
      JSON.stringify({ error: 'Cryptographic signature verification failed' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  // 3. Prevent replay attacks via clock drift check
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - authEvent.created_at) > ADMIN_CHALLENGE_TIMEOUT_SECONDS) {
    return new Response(
      JSON.stringify({
        error: 'Authorization event expired or timestamp out of drift window',
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  // 4. Verify authority: Admin can invalidate anything; non-admins can only invalidate
  // coordinates/albums they authored.
  const callerIsAdmin = isAdmin(authEvent.pubkey);
  if (!callerIsAdmin && body.coordinate) {
    // If coordinate is in format 31922:<pubkey>:<dTag>, verify pubkey matches caller
    if (body.coordinate.includes(':')) {
      const coordinatePubkey = body.coordinate.split(':')[1];
      if (coordinatePubkey && coordinatePubkey !== authEvent.pubkey) {
        return new Response(
          JSON.stringify({
            error:
              'Forbidden: You can only invalidate albums created by your pubkey',
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
    }
  }

  // 5. Execute edge cache invalidation
  const edgeCache = getSharedEdgeCache();
  const purged: string[] = [];
  const origin = new URL(request.url).origin;

  // Invalidate coordinate or slug
  const targetCoordinate = body.coordinate || body.slug;
  if (targetCoordinate) {
    const coordPurged = await edgeCache.invalidateCoordinate(
      targetCoordinate,
      origin,
    );
    purged.push(...coordPurged);
  }

  // Invalidate specific paths
  if (Array.isArray(body.paths)) {
    for (const path of body.paths) {
      if (typeof path === 'string') {
        const fullUrl = normalizeCacheKey(path, origin);
        await edgeCache.delete(fullUrl);
        purged.push(fullUrl);
      }
    }
  }

  // Invalidate photo hashes (download endpoints)
  if (Array.isArray(body.hashes)) {
    for (const hash of body.hashes) {
      if (typeof hash === 'string') {
        const downloadPath = `/api/download/${hash.toLowerCase()}`;
        const fullUrl = normalizeCacheKey(downloadPath, origin);
        await edgeCache.delete(fullUrl);
        purged.push(fullUrl);
      }
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      purgedCount: purged.length,
      purged,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    },
  );
};

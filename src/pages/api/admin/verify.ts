/**
 * Admin Cryptographic Verification API Route: /api/admin/verify
 * photo.emre.xyz
 *
 * Provides challenge nonces via GET and verifies signed challenge events via POST.
 */

import type { APIRoute } from 'astro';
import {
  createAdminChallenge,
  verifyAdminChallenge,
} from '../../../lib/nostr/admin';
import { ADMIN_PUBKEY } from '../../../lib/nostr/config';
import type { NostrEvent } from '../../../lib/nostr/types';

export const prerender = false;

/**
 * GET: Issues a fresh, timestamped challenge nonce for admin authentication.
 */
export const GET: APIRoute = async () => {
  const challengeData = createAdminChallenge();
  return new Response(JSON.stringify(challengeData), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
};

/**
 * POST: Cryptographically validates the caller's challenge signature against ADMIN_PUBKEY.
 */
export const POST: APIRoute = async ({ request }) => {
  let body: { event?: NostrEvent; challenge?: string };

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Malformed JSON payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { event, challenge } = body;

  if (!event || !challenge) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: event and challenge' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const result = verifyAdminChallenge(event, challenge, ADMIN_PUBKEY);

  if (!result.valid) {
    return new Response(
      JSON.stringify({
        error: result.error || 'Verification failed',
        valid: false,
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      valid: true,
      pubkey: result.pubkey,
      isAdmin: true,
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

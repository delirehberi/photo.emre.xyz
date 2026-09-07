/**
 * Cloudflare Worker Edge Route: /api/download/:hash
 * photo.emre.xyz
 *
 * Resolves content-owner profile metadata from Nostr relays, fetches the source blob from
 * Blossom serverless, dynamically composites the content-owner watermark using Cloudflare
 * Image Transformers, and serves the result with immutable edge caching.
 */

import type { APIRoute } from 'astro';
import {
  DEFAULT_BLOSSOM_SERVER,
  DEFAULT_WATERMARK_FALLBACK,
} from '../../../lib/blossom/config';
import { parseDimensionsFromBuffer } from '../../../lib/media/dimensions';
import { applyWatermarkTransformation } from '../../../lib/media/transformer';
import { resolveWatermarkLabel } from '../../../lib/media/watermark';
import { DEFAULT_RELAYS, NOSTR_KINDS } from '../../../lib/nostr/config';
import { getSharedRelayPool } from '../../../lib/nostr/pool';
import { sanitizeSha256 } from '../../../lib/nostr/sanitizer';
import { parsePhotoEvent } from '../../../lib/nostr/schemas/photo';
import { parseProfileEvent } from '../../../lib/nostr/schemas/profile';

export const prerender = false;

const SHA256_REGEX = /^[a-f0-9]{64}$/i;

export const GET: APIRoute = async ({ params, request, locals }) => {
  const { hash } = params;

  // 1. Validate SHA-256 parameter
  if (!hash || !SHA256_REGEX.test(hash)) {
    return new Response(
      JSON.stringify({ error: 'Invalid or missing SHA-256 hash parameter' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const sanitizedHash = sanitizeSha256(hash.toLowerCase())!;
  const url = new URL(request.url);
  const albumParam = url.searchParams.get('album');

  let ownerPubkey: string | undefined;
  let dimensions: { width: number; height: number } | undefined;
  let watermarkLabel = DEFAULT_WATERMARK_FALLBACK;
  let mediaSourceUrl: string | undefined;

  // 2. Query Relay Mesh for Kind 1063 Photo Event by SHA-256
  const relayPool = getSharedRelayPool();
  try {
    const photoEvent = await relayPool.queryOne(DEFAULT_RELAYS, {
      kinds: [NOSTR_KINDS.PHOTO_METADATA],
      '#x': [sanitizedHash],
    });

    if (photoEvent) {
      ownerPubkey = photoEvent.pubkey;
      try {
        const photoMetadata = parsePhotoEvent(photoEvent);
        dimensions = photoMetadata.dimensions;
        if (photoMetadata.url) {
          mediaSourceUrl = photoMetadata.url;
        }
      } catch {
        // Fall back to buffer dimension parsing
      }

      // Query Kind 0 profile for the content owner
      const profileEvent = await relayPool.queryOne(DEFAULT_RELAYS, {
        kinds: [NOSTR_KINDS.METADATA],
        authors: [ownerPubkey],
      });

      if (profileEvent) {
        const profile = parseProfileEvent(profileEvent);
        watermarkLabel = resolveWatermarkLabel(profile);
      }
    } else if (albumParam) {
      // Optional fallback: query by album coordinate if provided
      const albumPhotos = await relayPool.queryEvents(DEFAULT_RELAYS, {
        kinds: [NOSTR_KINDS.PHOTO_METADATA],
        '#a': [albumParam],
      });

      const matchedEvent = albumPhotos.find((e) =>
        e.tags.some(
          (t) => t[0] === 'x' && t[1]?.toLowerCase() === sanitizedHash,
        ),
      );

      if (matchedEvent) {
        ownerPubkey = matchedEvent.pubkey;
        try {
          const photoMetadata = parsePhotoEvent(matchedEvent);
          dimensions = photoMetadata.dimensions;
          if (photoMetadata.url) {
            mediaSourceUrl = photoMetadata.url;
          }
        } catch {
          // Fall back
        }
        const profileEvent = await relayPool.queryOne(DEFAULT_RELAYS, {
          kinds: [NOSTR_KINDS.METADATA],
          authors: [ownerPubkey],
        });
        if (profileEvent) {
          const profile = parseProfileEvent(profileEvent);
          watermarkLabel = resolveWatermarkLabel(profile);
        }
      }
    }
  } catch (error) {
    console.warn('Relay query error during watermark resolution:', error);
  }

  // 3. Fetch original media blob from Blossom serverless
  const runtimeEnv = (
    locals as {
      runtime?: {
        env?: {
          IMAGES?: import('../../../lib/media/transformer').CloudflareImagesBinding;
          BLOSSOM_SERVER_URL?: string;
        };
      };
    }
  )?.runtime?.env;

  const blossomServer =
    runtimeEnv?.BLOSSOM_SERVER_URL ||
    import.meta.env.BLOSSOM_SERVER_URL ||
    DEFAULT_BLOSSOM_SERVER;
  const blossomUrl =
    mediaSourceUrl || `${blossomServer.replace(/\/+$/, '')}/${sanitizedHash}`;

  let blossomResponse: Response;
  try {
    blossomResponse = await fetch(blossomUrl);
  } catch {
    return new Response(
      JSON.stringify({ error: 'Failed to contact Blossom media backend' }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  if (!blossomResponse.ok) {
    return new Response(
      JSON.stringify({ error: 'Media not found on Blossom server' }),
      {
        status: blossomResponse.status === 404 ? 404 : blossomResponse.status,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const imageBuffer = await blossomResponse.arrayBuffer();
  const rawContentType =
    blossomResponse.headers.get('Content-Type') || 'image/jpeg';

  // 4. Resolve dimensions if not obtained from Nostr event
  if (!dimensions) {
    const parsedDims = parseDimensionsFromBuffer(new Uint8Array(imageBuffer));
    dimensions = parsedDims || { width: 1920, height: 1080 };
  }

  // 5. Apply dynamic watermark transformation
  const imagesBinding = runtimeEnv?.IMAGES;
  const transformed = await applyWatermarkTransformation(
    imageBuffer,
    watermarkLabel,
    {
      imagesBinding,
      width: dimensions.width,
      height: dimensions.height,
      mimeType: rawContentType,
      quality: 92,
    },
  );

  // 6. Build response with aggressive edge caching headers
  const outputContentType =
    transformed.headers.get('Content-Type') || rawContentType;
  const extension = outputContentType.includes('svg') ? 'svg' : 'jpg';
  const filename = `${sanitizedHash}-watermarked.${extension}`;

  const responseHeaders = new Headers(transformed.headers);
  responseHeaders.set('Content-Type', outputContentType);
  responseHeaders.set(
    'Content-Disposition',
    `attachment; filename="${filename}"`,
  );
  responseHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
  responseHeaders.set('X-Content-Owner', ownerPubkey || 'unindexed');
  responseHeaders.set('X-Watermark-Label', watermarkLabel);

  return new Response(transformed.body, {
    status: 200,
    headers: responseHeaders,
  });
};

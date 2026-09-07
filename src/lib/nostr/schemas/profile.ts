/**
 * Kind 0: Metadata / Organization Profile (NIP-01)
 * photo.emre.xyz
 */

import { z } from 'zod';
import { NOSTR_KINDS } from '../config';
import { sanitizePubkey, sanitizeText, sanitizeUrl } from '../sanitizer';
import type { NostrEvent, EventTemplate, OrganizationProfile } from '../types';

/**
 * Raw Kind 0 JSON content schema
 */
export const RawProfileContentSchema = z
  .object({
    name: z.string().optional(),
    display_name: z.string().optional(),
    about: z.string().optional(),
    picture: z.string().optional(),
    banner: z.string().optional(),
    nip05: z.string().optional(),
    lud16: z.string().optional(),
    lud06: z.string().optional(),
    lnurl: z.string().optional(),
    website: z.string().optional(),
  })
  .passthrough();

export type RawProfileContent = z.infer<typeof RawProfileContentSchema>;

/**
 * Validates and parses a Nostr Kind 0 event into a clean OrganizationProfile.
 * Automatically sanitizes all strings and validates URLs.
 */
export function parseProfileEvent(event: NostrEvent): OrganizationProfile {
  if (event.kind !== NOSTR_KINDS.METADATA) {
    throw new Error(
      `Invalid event kind: expected ${NOSTR_KINDS.METADATA}, received ${event.kind}`,
    );
  }

  const pubkey = sanitizePubkey(event.pubkey);
  if (!pubkey) {
    throw new Error('Invalid author pubkey on Kind 0 event');
  }

  let raw: RawProfileContent = {};
  try {
    const parsedJson = JSON.parse(event.content || '{}');
    const validated = RawProfileContentSchema.safeParse(parsedJson);
    if (validated.success) {
      raw = validated.data;
    }
  } catch {
    // Malformed JSON falls back to empty defaults
    raw = {};
  }

  const name = sanitizeText(raw.name, 100);
  const displayName = sanitizeText(raw.display_name || raw.name, 100);
  const about = sanitizeText(raw.about, 2000);
  const picture = sanitizeUrl(raw.picture) || '';
  const banner = sanitizeUrl(raw.banner) || undefined;
  const nip05 = sanitizeText(raw.nip05, 128) || undefined;
  const lud16 = sanitizeText(raw.lud16, 128) || undefined;
  const lud06 = sanitizeText(raw.lud06 || raw.lnurl, 300) || undefined;
  const website = sanitizeUrl(raw.website) || undefined;

  return {
    pubkey,
    name,
    displayName: displayName || name,
    about,
    picture,
    banner,
    nip05,
    lud16,
    lud06,
    website,
    createdAt: event.created_at,
  };
}

/**
 * Creates an unsigned EventTemplate for a Kind 0 Organization Profile.
 */
export function createProfileEventTemplate(
  profile: Partial<Omit<OrganizationProfile, 'pubkey' | 'createdAt'>>,
): EventTemplate {
  const content = JSON.stringify({
    name: profile.name?.trim() || '',
    display_name: profile.displayName?.trim() || profile.name?.trim() || '',
    about: profile.about?.trim() || '',
    picture: profile.picture?.trim() || '',
    banner: profile.banner?.trim() || undefined,
    nip05: profile.nip05?.trim() || undefined,
    lud16: profile.lud16?.trim() || undefined,
    lud06: profile.lud06?.trim() || undefined,
    website: profile.website?.trim() || undefined,
  });

  return {
    kind: NOSTR_KINDS.METADATA,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content,
  };
}

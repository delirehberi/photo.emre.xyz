/**
 * Curated Blossom Media Servers & Discovery Engine
 * photo.emre.xyz
 *
 * Provides pre-configured, tested Blossom servers (BUD-01/02),
 * with primal.net as the high-throughput public default,
 * media.nostr.org.tr for Turkish Nostr community members,
 * media.emre.xyz for authorized organizations and administrators,
 * and support for custom endpoints.
 */

export interface BlossomServerOption {
  id: string;
  name: string;
  url: string;
  tag: string;
  description: string;
  isDefault?: boolean;
  requiresMembership?: boolean;
  isPrivate?: boolean;
  badge?: string;
}

/**
 * High-throughput public CDN default
 */
export const DEFAULT_BLOSSOM_SERVER_URL = 'https://blossom.primal.net';

/**
 * Curated list of Blossom servers available for selection
 */
export const CURATED_BLOSSOM_SERVERS: BlossomServerOption[] = [
  {
    id: 'primal',
    name: 'Primal Media CDN',
    url: 'https://blossom.primal.net',
    tag: 'Varsayılan',
    description: 'Hızlı ve genel erişilebilir Blossom içerik dağıtım ağı.',
    isDefault: true,
    badge: 'Hızlı CDN',
  },
  {
    id: 'nostr-tr',
    name: 'Nostr Türkiye Media',
    url: 'https://media.nostr.org.tr',
    tag: 'Topluluk',
    description: 'nostr.org.tr topluluk üyeleri için yetkili Blossom sunucusu.',
    requiresMembership: true,
    badge: 'nostr.org.tr',
  },
  {
    id: 'emre-xyz',
    name: 'photo.emre.xyz Özel Sunucu',
    url: 'https://media.emre.xyz',
    tag: 'Yetkili Org & Admin',
    description:
      'Yetkili organizasyonlar ve platform yöneticileri için özel sunucu.',
    isPrivate: true,
    badge: 'Özel / Yetkili',
  },
  {
    id: 'satellite',
    name: 'Satellite CDN',
    url: 'https://cdn.satellite.earth',
    tag: 'Genel',
    description: 'Satellite.earth açık topluluk Blossom barındırma sunucusu.',
  },
  {
    id: 'nostr-download',
    name: 'Nostr Download',
    url: 'https://nostr.download',
    tag: 'Genel',
    description: 'Açık kaynak Blossom medya sunucusu.',
  },
];

/**
 * Normalizes a Blossom server URL by stripping trailing slashes and ensuring https protocol
 */
export function normalizeBlossomUrl(rawUrl: string): string {
  if (!rawUrl) return DEFAULT_BLOSSOM_SERVER_URL;
  const trimmed = rawUrl.trim().replace(/\/+$/, '');
  if (trimmed.includes('://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Validates whether an input string is a syntactically valid HTTP/HTTPS URL
 */
export function isValidBlossomUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(normalizeBlossomUrl(url));
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Lightweight connectivity check to test whether a Blossom server responds
 */
export async function checkBlossomServerConnectivity(
  url: string,
  timeoutMs = 4000,
): Promise<boolean> {
  const normalized = normalizeBlossomUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(normalized, {
      method: 'HEAD',
      signal: controller.signal,
    });
    // Any response from 200 up to 404/405 indicates a reachable HTTP host
    return res.status >= 200 && res.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

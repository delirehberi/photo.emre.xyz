/**
 * Dynamic Content-Owner Watermarking Engine
 * photo.emre.xyz
 */

import { DEFAULT_WATERMARK_FALLBACK } from '../blossom/config';
import type { OrganizationProfile } from '../nostr/types';

/**
 * Resolves the publisher watermark label following the strict hierarchy:
 * 1. Publisher NIP-05 identifier (e.g. "emre@emre.xyz")
 * 2. Kind 0 Display Name (e.g. "Emre Yılmaz")
 * 3. Kind 0 Name (e.g. "delirehberi")
 * 4. Default fallback ("@delirehberi")
 */
export function resolveWatermarkLabel(
  profile?: OrganizationProfile | null,
): string {
  if (!profile) {
    return DEFAULT_WATERMARK_FALLBACK;
  }

  const nip05 = profile.nip05?.trim();
  if (nip05) return nip05;

  const displayName = profile.displayName?.trim();
  if (displayName) return displayName;

  const name = profile.name?.trim();
  if (name) return name;

  return DEFAULT_WATERMARK_FALLBACK;
}

/**
 * Escapes characters with special meaning in XML/SVG to prevent injection vulnerabilities.
 */
export function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export interface WatermarkBadgeOptions {
  fontSize?: number;
  scale?: number;
}

/**
 * Generates an SVG watermark pill badge to be composited onto an image via Cloudflare Image Transformers.
 */
export function createWatermarkBadgeSvg(
  label: string,
  options: WatermarkBadgeOptions = {},
): string {
  const sanitizedLabel = escapeXml(label.trim() || DEFAULT_WATERMARK_FALLBACK);
  const fontSize = options.fontSize || 18;
  const paddingX = 18;
  const paddingY = 10;
  const iconSize = fontSize * 1.1;
  const iconGap = 10;

  // Approximate text width: ~0.58 of font-size per character for bold sans-serif
  const approxTextWidth = Math.round(sanitizedLabel.length * (fontSize * 0.58));
  const badgeWidth = paddingX * 2 + iconSize + iconGap + approxTextWidth;
  const badgeHeight = paddingY * 2 + fontSize;
  const borderRadius = Math.round(badgeHeight / 2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${badgeWidth}" height="${badgeHeight}" viewBox="0 0 ${badgeWidth} ${badgeHeight}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" stop-opacity="0.82" />
      <stop offset="100%" stop-color="#1e293b" stop-opacity="0.88" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.45" />
    </filter>
  </defs>
  <rect x="1" y="1" width="${badgeWidth - 2}" height="${badgeHeight - 2}" rx="${borderRadius}" fill="url(#bg)" stroke="rgba(255,255,255,0.22)" stroke-width="1.5" filter="url(#shadow)" />
  <!-- Camera Icon -->
  <g transform="translate(${paddingX}, ${(badgeHeight - iconSize) / 2})" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" transform="scale(${iconSize / 24})" />
    <circle cx="12" cy="13" r="3" transform="scale(${iconSize / 24})" />
  </g>
  <!-- Author Label -->
  <text x="${paddingX + iconSize + iconGap}" y="${(badgeHeight + fontSize * 0.72) / 2}" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="${fontSize}" font-weight="600" letter-spacing="0.2px">${sanitizedLabel}</text>
</svg>`;
}

/**
 * Creates a complete self-contained SVG image with the photo embedded and the watermark badge
 * composited into the bottom-right corner.
 * Used as an edge fallback in environments where Cloudflare Image Transformers binding is not configured.
 */
export function createSvgCompositedFallback(options: {
  imageBase64: string;
  mimeType: string;
  width: number;
  height: number;
  watermarkLabel: string;
}): string {
  const { imageBase64, mimeType, width, height, watermarkLabel } = options;
  const badgeSvg = createWatermarkBadgeSvg(watermarkLabel);

  // Scaled margin for bottom-right positioning
  const marginX = Math.max(20, Math.round(width * 0.03));
  const marginY = Math.max(20, Math.round(height * 0.03));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image href="data:${mimeType};base64,${imageBase64}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" />
  <g transform="translate(${width - marginX}, ${height - marginY})">
    <g transform="translate(-100%, -100%)">
      ${badgeSvg}
    </g>
  </g>
</svg>`;
}

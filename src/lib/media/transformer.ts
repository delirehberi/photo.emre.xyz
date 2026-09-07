/**
 * Cloudflare Image Transformers Integration
 * photo.emre.xyz
 *
 * Utilizes Cloudflare Workers Images binding (env.IMAGES.input().draw().output())
 * to apply dynamic content-owner watermarks directly to images at the edge.
 */

import {
  createSvgCompositedFallback,
  createWatermarkBadgeSvg,
} from './watermark';

export interface CloudflareImagesBinding {
  input: (streamOrBuffer: unknown) => {
    draw: (
      overlay: unknown,
      options: { bottom?: number; right?: number; opacity?: number },
    ) => {
      output: (options: { format?: string; quality?: number }) => {
        response: () => Promise<Response>;
      };
    };
  };
}

export interface TransformationOptions {
  /** Cloudflare Images binding (env.IMAGES) if present */
  imagesBinding?: CloudflareImagesBinding | null;
  /** Image dimensions if known */
  width?: number;
  height?: number;
  /** MIME type of the original image */
  mimeType?: string;
  /** Quality percentage (1 to 100) */
  quality?: number;
}

/**
 * Applies a dynamic watermark overlay onto an image using Cloudflare Image Transformers
 * or a graceful edge compositor fallback if the binding is not configured.
 */
export async function applyWatermarkTransformation(
  imageBuffer: ArrayBuffer,
  watermarkLabel: string,
  options: TransformationOptions = {},
): Promise<Response> {
  const width = options.width || 1920;
  const height = options.height || 1080;
  const mimeType = options.mimeType || 'image/jpeg';
  const quality = options.quality || 92;

  // Generate the dynamic SVG watermark badge
  const badgeSvg = createWatermarkBadgeSvg(watermarkLabel);

  // Scaled margins for bottom-right placement
  const marginX = Math.max(16, Math.round(width * 0.03));
  const marginY = Math.max(16, Math.round(height * 0.03));

  // If Cloudflare Images binding (env.IMAGES) is available
  if (
    options.imagesBinding &&
    typeof options.imagesBinding.input === 'function'
  ) {
    try {
      const badgeBlob = new Blob([badgeSvg], { type: 'image/svg+xml' });
      const transformed = await options.imagesBinding
        .input(imageBuffer)
        .draw(options.imagesBinding.input(badgeBlob.stream()), {
          bottom: marginY,
          right: marginX,
          opacity: 0.95,
        })
        .output({ format: 'image/jpeg', quality })
        .response();

      return transformed;
    } catch (error) {
      // If image transformation fails, log and proceed to fallback
      console.warn(
        'Cloudflare Image Transformation failed, using fallback:',
        error,
      );
    }
  }

  // Edge / Dev fallback: composite self-contained SVG
  const bytes = new Uint8Array(imageBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  const svgComposited = createSvgCompositedFallback({
    imageBase64: base64,
    mimeType,
    width,
    height,
    watermarkLabel,
  });

  return new Response(svgComposited, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
    },
  });
}

export const SUPPORTED_THUMBNAIL_EXTENSIONS = [
  'gif',
  'jpg',
  'jpeg',
  'heic',
  'png',
  'svg',
  'webp',
] as const;

export type SupportedThumbnailExtension =
  (typeof SUPPORTED_THUMBNAIL_EXTENSIONS)[number];

const THUMBNAIL_EXTENSION_REGEX = new RegExp(
  `\\.(${SUPPORTED_THUMBNAIL_EXTENSIONS.join('|')})$`,
  'i',
);

/**
 * Checks if a given URL is hosted on media.emre.xyz and has a supported thumbnail extension.
 */
export function isTransformableMediaUrl(
  url: string | null | undefined,
): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.toLowerCase() !== 'media.emre.xyz') {
      return false;
    }
    return THUMBNAIL_EXTENSION_REGEX.test(parsed.pathname);
  } catch {
    return false;
  }
}

/**
 * Returns a transformed thumbnail URL (height=500) for media.emre.xyz images.
 * Preserves existing search params and leaves third-party or non-matching URLs intact.
 */
export function getThumbnailUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return url || '';
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname.toLowerCase() === 'media.emre.xyz' &&
      THUMBNAIL_EXTENSION_REGEX.test(parsed.pathname)
    ) {
      parsed.searchParams.set('thumbnail', 'true');
      return parsed.toString();
    }
    return url;
  } catch {
    return url;
  }
}

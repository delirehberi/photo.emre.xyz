/**
 * Client-Side Canvas Watermarking & Raster Export Engine
 * photo.emre.xyz
 *
 * Used by the in-browser Lightbox to export raster images (JPEG/PNG) with client-rendered
 * publisher watermarks directly from the client.
 */

import { DEFAULT_WATERMARK_FALLBACK } from '../blossom/config';

export interface CanvasWatermarkOptions {
  format?: 'image/jpeg' | 'image/png';
  quality?: number;
}

/**
 * Draws an image onto an HTML5 canvas, burns the content-owner watermark badge
 * into the bottom-right corner, and exports the resulting image as a Blob.
 */
export async function renderCanvasWatermark(
  imageSource: CanvasImageSource,
  width: number,
  height: number,
  watermarkLabel: string,
  options: CanvasWatermarkOptions = {},
): Promise<Blob> {
  if (typeof document === 'undefined') {
    throw new Error(
      'renderCanvasWatermark requires a browser environment with DOM access',
    );
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to obtain 2D canvas rendering context');
  }

  // 1. Draw source image
  ctx.drawImage(imageSource, 0, 0, width, height);

  // 2. Compute badge parameters proportional to image size
  const label = watermarkLabel.trim() || DEFAULT_WATERMARK_FALLBACK;
  const baseFontSize = Math.max(14, Math.round(height * 0.022));
  ctx.font = `600 ${baseFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

  const textMetrics = ctx.measureText(label);
  const textWidth = textMetrics.width;

  const paddingX = Math.round(baseFontSize * 1.2);
  const paddingY = Math.round(baseFontSize * 0.7);
  const iconSize = Math.round(baseFontSize * 1.1);
  const iconGap = Math.round(baseFontSize * 0.5);

  const badgeWidth = paddingX * 2 + iconSize + iconGap + textWidth;
  const badgeHeight = paddingY * 2 + baseFontSize;
  const borderRadius = badgeHeight / 2;

  const marginX = Math.max(20, Math.round(width * 0.03));
  const marginY = Math.max(20, Math.round(height * 0.03));
  const badgeX = width - marginX - badgeWidth;
  const badgeY = height - marginY - badgeHeight;

  // 3. Draw translucent dark pill background with drop shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, borderRadius);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 4. Draw Camera Icon
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const iconX = badgeX + paddingX;
  const iconY = badgeY + (badgeHeight - iconSize) / 2;
  const scale = iconSize / 24;

  ctx.translate(iconX, iconY);
  ctx.scale(scale, scale);

  ctx.beginPath();
  // Camera body
  ctx.moveTo(14.5, 4);
  ctx.lineTo(9.5, 4);
  ctx.lineTo(7, 7);
  ctx.lineTo(4, 7);
  ctx.arcTo(2, 7, 2, 9, 2);
  ctx.lineTo(2, 18);
  ctx.arcTo(2, 20, 4, 20, 2);
  ctx.lineTo(20, 20);
  ctx.arcTo(22, 20, 22, 18, 2);
  ctx.lineTo(22, 9);
  ctx.arcTo(22, 7, 20, 7, 2);
  ctx.lineTo(17, 7);
  ctx.closePath();
  ctx.stroke();

  // Camera lens
  ctx.beginPath();
  ctx.arc(12, 13, 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 5. Draw Author Label Text
  ctx.save();
  ctx.font = `600 ${baseFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    label,
    badgeX + paddingX + iconSize + iconGap,
    badgeY + badgeHeight / 2 + 1,
  );
  ctx.restore();

  // 6. Export to Blob
  const mime = options.format || 'image/jpeg';
  const quality = options.quality ?? 0.92;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create image blob from canvas'));
        }
      },
      mime,
      quality,
    );
  });
}

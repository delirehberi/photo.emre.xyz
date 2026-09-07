/**
 * QR Code Generation Utilities
 * photo.emre.xyz
 */

import QRCode from 'qrcode';

export interface QrOptions {
  margin?: number;
  width?: number;
  darkColor?: string;
  lightColor?: string;
}

/**
 * Generates an SVG string representation of a QR code.
 */
export async function generateQrSvg(
  text: string,
  options: QrOptions = {},
): Promise<string> {
  const margin = options.margin ?? 1;
  const width = options.width ?? 256;
  const darkColor = options.darkColor ?? '#000000';
  const lightColor = options.lightColor ?? '#ffffff';

  return QRCode.toString(text, {
    type: 'svg',
    margin,
    width,
    color: {
      dark: darkColor,
      light: lightColor,
    },
    errorCorrectionLevel: 'M',
  });
}

/**
 * Generates a base64 Data URL (image/png) for a QR code.
 */
export async function generateQrDataUrl(
  text: string,
  options: QrOptions = {},
): Promise<string> {
  const margin = options.margin ?? 1;
  const width = options.width ?? 256;
  const darkColor = options.darkColor ?? '#000000';
  const lightColor = options.lightColor ?? '#ffffff';

  return QRCode.toDataURL(text, {
    margin,
    width,
    color: {
      dark: darkColor,
      light: lightColor,
    },
    errorCorrectionLevel: 'M',
  });
}

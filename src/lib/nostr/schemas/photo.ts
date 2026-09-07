/**
 * Kind 1063: Photo Item (NIP-94 File Metadata)
 * photo.emre.xyz
 */

import { NOSTR_KINDS } from '../config';
import {
  sanitizeCoordinate,
  sanitizePubkey,
  sanitizeSha256,
  sanitizeText,
  sanitizeUrl,
} from '../sanitizer';
import type {
  NostrEvent,
  EventTemplate,
  PhotoMetadata,
  PhotoDimensions,
} from '../types';

/**
 * Parses and validates a dimension string in `<width>x<height>` format (e.g. "1920x1080").
 * Calculates the numeric aspect ratio (width / height) to enable zero-CLS CSS styling.
 */
export function parsePhotoDimensions(dimStr: string): PhotoDimensions {
  if (typeof dimStr !== 'string') {
    throw new Error('Dimension must be a string in "<width>x<height>" format');
  }

  const parts = dimStr.trim().toLowerCase().split('x');
  if (parts.length !== 2) {
    throw new Error(
      `Malformed dimension string: "${dimStr}". Expected "<width>x<height>"`,
    );
  }

  const width = Number.parseInt(parts[0], 10);
  const height = Number.parseInt(parts[1], 10);

  if (
    Number.isNaN(width) ||
    Number.isNaN(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error(`Invalid non-positive dimensions: ${width}x${height}`);
  }

  const aspectRatio = Number((width / height).toFixed(4));

  return {
    width,
    height,
    aspectRatio,
  };
}

/**
 * Parses a Kind 1063 Nostr event into a typed PhotoMetadata entity.
 * Validates presence of mandatory NIP-94 tags (url, x, dim, m, a).
 */
export function parsePhotoEvent(event: NostrEvent): PhotoMetadata {
  if (event.kind !== NOSTR_KINDS.PHOTO_METADATA) {
    throw new Error(
      `Invalid event kind: expected ${NOSTR_KINDS.PHOTO_METADATA}, received ${event.kind}`,
    );
  }

  const pubkey = sanitizePubkey(event.pubkey);
  if (!pubkey) {
    throw new Error('Invalid author pubkey on Kind 1063 photo event');
  }

  let rawUrl: string | undefined;
  let rawSha256: string | undefined;
  let rawMime: string | undefined;
  let rawDim: string | undefined;
  let rawCoordinate: string | undefined;
  let blurhash: string | undefined;
  let alt: string | undefined;
  let summary: string | undefined;

  // EXIF metadata tags
  let exifMake: string | undefined;
  let exifModel: string | undefined;
  let exifLens: string | undefined;
  let exifIso: string | undefined;
  let exifAperture: string | undefined;
  let exifShutter: string | undefined;
  let exifFocal: string | undefined;
  let exifDateTime: string | undefined;

  for (const tag of event.tags) {
    if (!Array.isArray(tag) || tag.length < 2) continue;
    const [tagName, tagValue] = tag;

    switch (tagName.toLowerCase()) {
      case 'url':
        if (!rawUrl) rawUrl = tagValue;
        break;
      case 'x':
        if (!rawSha256) rawSha256 = tagValue;
        break;
      case 'm':
        if (!rawMime) rawMime = tagValue;
        break;
      case 'dim':
        if (!rawDim) rawDim = tagValue;
        break;
      case 'a':
        if (!rawCoordinate) rawCoordinate = tagValue;
        break;
      case 'blurhash':
        if (!blurhash) blurhash = sanitizeText(tagValue, 100);
        break;
      case 'alt':
        if (!alt) alt = sanitizeText(tagValue, 500);
        break;
      case 'summary':
      case 'caption':
        if (!summary) summary = sanitizeText(tagValue, 500);
        break;
      case 'make':
        if (!exifMake) exifMake = sanitizeText(tagValue, 100);
        break;
      case 'model':
      case 'camera':
        if (!exifModel) exifModel = sanitizeText(tagValue, 100);
        break;
      case 'lens':
        if (!exifLens) exifLens = sanitizeText(tagValue, 100);
        break;
      case 'iso':
        if (!exifIso) exifIso = sanitizeText(tagValue, 20);
        break;
      case 'f':
      case 'aperture':
        if (!exifAperture) exifAperture = sanitizeText(tagValue, 20);
        break;
      case 'exp':
      case 'shutter':
        if (!exifShutter) exifShutter = sanitizeText(tagValue, 20);
        break;
      case 'focal':
      case 'focallength':
        if (!exifFocal) exifFocal = sanitizeText(tagValue, 20);
        break;
      case 'datetimeoriginal':
        if (!exifDateTime) exifDateTime = sanitizeText(tagValue, 50);
        break;
    }
  }

  const url = sanitizeUrl(rawUrl);
  if (!url) {
    throw new Error('Missing or invalid "url" tag in Kind 1063 photo event');
  }

  const sha256 = sanitizeSha256(rawSha256);
  if (!sha256) {
    throw new Error(
      'Missing or invalid SHA-256 "x" tag in Kind 1063 photo event',
    );
  }

  const mimeType = (rawMime || 'image/jpeg').trim().toLowerCase();
  if (!mimeType.startsWith('image/')) {
    throw new Error(
      `Unsupported MIME type: "${mimeType}". Expected an image format`,
    );
  }

  if (!rawDim) {
    throw new Error('Missing mandatory "dim" tag for zero-CLS layout');
  }
  const dimensions = parsePhotoDimensions(rawDim);

  const albumCoordinate = sanitizeCoordinate(rawCoordinate);
  if (!albumCoordinate) {
    throw new Error(
      'Missing or invalid Event Album coordinate "a" tag in Kind 1063',
    );
  }

  const contentCaption = sanitizeText(event.content, 2000) || undefined;

  let exif: PhotoMetadata['exif'];
  if (
    exifMake ||
    exifModel ||
    exifLens ||
    exifIso ||
    exifAperture ||
    exifShutter ||
    exifFocal ||
    exifDateTime
  ) {
    exif = {
      make: exifMake,
      model: exifModel,
      lens: exifLens,
      iso: exifIso,
      aperture: exifAperture,
      shutterSpeed: exifShutter,
      focalLength: exifFocal,
      dateTimeOriginal: exifDateTime,
    };
  }

  return {
    id: event.id,
    pubkey,
    url,
    sha256,
    mimeType,
    dimensions,
    albumCoordinate,
    blurhash,
    alt,
    summary: summary || contentCaption,
    exif,
    createdAt: event.created_at,
  };
}

/**
 * Creates an unsigned EventTemplate for a Kind 1063 Photo Item.
 */
export function createPhotoEventTemplate(params: {
  url: string;
  sha256: string;
  dimensions: { width: number; height: number };
  albumCoordinate: string;
  mimeType?: string;
  blurhash?: string;
  alt?: string;
  summary?: string;
  description?: string;
  exif?: {
    make?: string;
    model?: string;
    lens?: string;
    iso?: string | number;
    aperture?: string;
    shutterSpeed?: string;
    focalLength?: string;
    dateTimeOriginal?: string;
  };
}): EventTemplate {
  const url = sanitizeUrl(params.url);
  if (!url) {
    throw new Error('Valid URL is required to create a Photo event');
  }

  const sha256 = sanitizeSha256(params.sha256);
  if (!sha256) {
    throw new Error('Valid 64-char hex SHA-256 hash is required');
  }

  const coord = sanitizeCoordinate(params.albumCoordinate);
  if (!coord) {
    throw new Error('Valid Event Album coordinate is required');
  }

  if (params.dimensions.width <= 0 || params.dimensions.height <= 0) {
    throw new Error('Dimensions must be greater than zero');
  }

  const dimStr = `${Math.round(params.dimensions.width)}x${Math.round(params.dimensions.height)}`;
  const mimeType = (params.mimeType || 'image/jpeg').trim().toLowerCase();

  const tags: string[][] = [
    ['url', url],
    ['x', sha256],
    ['m', mimeType],
    ['dim', dimStr],
    ['a', coord],
  ];

  if (params.blurhash?.trim()) {
    tags.push(['blurhash', params.blurhash.trim()]);
  }

  if (params.alt?.trim()) {
    tags.push(['alt', params.alt.trim()]);
  }

  if (params.summary?.trim()) {
    tags.push(['summary', params.summary.trim()]);
  }

  if (params.exif) {
    const { exif } = params;
    if (exif.make?.trim()) tags.push(['make', exif.make.trim()]);
    if (exif.model?.trim()) tags.push(['model', exif.model.trim()]);
    if (exif.lens?.trim()) tags.push(['lens', exif.lens.trim()]);
    if (exif.iso !== undefined && exif.iso !== null && `${exif.iso}`.trim()) {
      tags.push(['iso', `${exif.iso}`.trim()]);
    }
    if (exif.aperture?.trim()) tags.push(['f', exif.aperture.trim()]);
    if (exif.shutterSpeed?.trim()) tags.push(['exp', exif.shutterSpeed.trim()]);
    if (exif.focalLength?.trim()) tags.push(['focal', exif.focalLength.trim()]);
    if (exif.dateTimeOriginal?.trim()) {
      tags.push(['datetimeoriginal', exif.dateTimeOriginal.trim()]);
    }
  }

  return {
    kind: NOSTR_KINDS.PHOTO_METADATA,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: params.description?.trim() || '',
  };
}

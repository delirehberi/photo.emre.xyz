/**
 * Kind 1063 (NIP-94 File Metadata) & Kind 20 (NIP-68 Picture Event) Schemas
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
  ImetaItem,
  PictureEventParams,
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
 * Serializes an ImetaItem into a NIP-92 formatted imeta tag array:
 * ["imeta", "url https://...", "m image/jpeg", "x <sha256>", "dim 1920x1080", ...]
 */
export function serializeImetaTag(item: ImetaItem): string[] {
  const url = sanitizeUrl(item.url);
  if (!url) {
    throw new Error('Valid URL is required for NIP-92 imeta tag');
  }

  const sha256 = sanitizeSha256(item.sha256);
  if (!sha256) {
    throw new Error('Valid 64-char hex SHA-256 hash is required for imeta tag');
  }

  if (
    !item.dimensions ||
    item.dimensions.width <= 0 ||
    item.dimensions.height <= 0
  ) {
    throw new Error('Valid positive dimensions are required for imeta tag');
  }

  const dimStr = `${Math.round(item.dimensions.width)}x${Math.round(item.dimensions.height)}`;
  const mimeType = (item.mimeType || 'image/jpeg').trim().toLowerCase();

  const parts: string[] = [
    'imeta',
    `url ${url}`,
    `m ${mimeType}`,
    `x ${sha256}`,
    `dim ${dimStr}`,
  ];

  if (item.blurhash?.trim()) {
    parts.push(`blurhash ${item.blurhash.trim()}`);
  }

  if (item.alt?.trim()) {
    const cleanAlt = sanitizeText(item.alt.trim(), 500);
    if (cleanAlt) parts.push(`alt ${cleanAlt}`);
  }

  if (item.summary?.trim()) {
    const cleanSummary = sanitizeText(item.summary.trim(), 500);
    if (cleanSummary) parts.push(`summary ${cleanSummary}`);
  }

  if (item.fallbackUrls && item.fallbackUrls.length > 0) {
    for (const fb of item.fallbackUrls) {
      const cleanFb = sanitizeUrl(fb);
      if (cleanFb) {
        parts.push(`fallback ${cleanFb}`);
      }
    }
  }

  if (item.exif) {
    const { exif } = item;
    if (exif.make?.trim()) {
      parts.push(`make ${sanitizeText(exif.make.trim(), 100)}`);
    }
    if (exif.model?.trim()) {
      parts.push(`model ${sanitizeText(exif.model.trim(), 100)}`);
    }
    if (exif.lens?.trim()) {
      parts.push(`lens ${sanitizeText(exif.lens.trim(), 100)}`);
    }
    if (exif.iso !== undefined && exif.iso !== null && `${exif.iso}`.trim()) {
      parts.push(`iso ${sanitizeText(`${exif.iso}`.trim(), 20)}`);
    }
    if (exif.aperture?.trim()) {
      parts.push(`f ${sanitizeText(exif.aperture.trim(), 20)}`);
    }
    if (exif.shutterSpeed?.trim()) {
      parts.push(`exp ${sanitizeText(exif.shutterSpeed.trim(), 20)}`);
    }
    if (exif.focalLength?.trim()) {
      parts.push(`focal ${sanitizeText(exif.focalLength.trim(), 20)}`);
    }
    if (exif.dateTimeOriginal?.trim()) {
      parts.push(
        `datetimeoriginal ${sanitizeText(exif.dateTimeOriginal.trim(), 50)}`,
      );
    }
  }

  return parts;
}

/**
 * Parses a single NIP-92 imeta tag into an ImetaItem.
 */
export function parseImetaTag(tag: string[]): ImetaItem {
  if (
    !Array.isArray(tag) ||
    tag.length < 2 ||
    tag[0].toLowerCase() !== 'imeta'
  ) {
    throw new Error('Invalid NIP-92 imeta tag structure');
  }

  let rawUrl: string | undefined;
  let rawSha256: string | undefined;
  let rawMime: string | undefined;
  let rawDim: string | undefined;
  let blurhash: string | undefined;
  let alt: string | undefined;
  let summary: string | undefined;
  const fallbackUrls: string[] = [];

  let exifMake: string | undefined;
  let exifModel: string | undefined;
  let exifLens: string | undefined;
  let exifIso: string | undefined;
  let exifAperture: string | undefined;
  let exifShutter: string | undefined;
  let exifFocal: string | undefined;
  let exifDateTime: string | undefined;

  for (let i = 1; i < tag.length; i++) {
    const entry = tag[i];
    if (typeof entry !== 'string') continue;

    const spaceIdx = entry.indexOf(' ');
    if (spaceIdx === -1) continue;

    const key = entry.slice(0, spaceIdx).trim().toLowerCase();
    const val = entry.slice(spaceIdx + 1).trim();
    if (!val) continue;

    switch (key) {
      case 'url':
        if (!rawUrl) rawUrl = val;
        break;
      case 'x':
        if (!rawSha256) rawSha256 = val;
        break;
      case 'm':
        if (!rawMime) rawMime = val;
        break;
      case 'dim':
        if (!rawDim) rawDim = val;
        break;
      case 'blurhash':
        if (!blurhash) blurhash = sanitizeText(val, 100);
        break;
      case 'alt':
        if (!alt) alt = sanitizeText(val, 500);
        break;
      case 'summary':
      case 'caption':
        if (!summary) summary = sanitizeText(val, 500);
        break;
      case 'fallback': {
        const cleanFb = sanitizeUrl(val);
        if (cleanFb && !fallbackUrls.includes(cleanFb)) {
          fallbackUrls.push(cleanFb);
        }
        break;
      }
      case 'make':
        if (!exifMake) exifMake = sanitizeText(val, 100);
        break;
      case 'model':
      case 'camera':
        if (!exifModel) exifModel = sanitizeText(val, 100);
        break;
      case 'lens':
        if (!exifLens) exifLens = sanitizeText(val, 100);
        break;
      case 'iso':
        if (!exifIso) exifIso = sanitizeText(val, 20);
        break;
      case 'f':
      case 'aperture':
        if (!exifAperture) exifAperture = sanitizeText(val, 20);
        break;
      case 'exp':
      case 'shutter':
        if (!exifShutter) exifShutter = sanitizeText(val, 20);
        break;
      case 'focal':
      case 'focallength':
        if (!exifFocal) exifFocal = sanitizeText(val, 20);
        break;
      case 'datetimeoriginal':
        if (!exifDateTime) exifDateTime = sanitizeText(val, 50);
        break;
    }
  }

  const url = sanitizeUrl(rawUrl);
  if (!url) {
    throw new Error('Missing or invalid "url" in NIP-92 imeta tag');
  }

  const sha256 = sanitizeSha256(rawSha256);
  if (!sha256) {
    throw new Error('Missing or invalid SHA-256 "x" in NIP-92 imeta tag');
  }

  const mimeType = (rawMime || 'image/jpeg').trim().toLowerCase();
  if (!mimeType.startsWith('image/')) {
    throw new Error(
      `Unsupported MIME type: "${mimeType}". Expected an image format`,
    );
  }

  if (!rawDim) {
    throw new Error(
      'Missing mandatory "dim" in NIP-92 imeta tag for zero-CLS layout',
    );
  }
  const dimensions = parsePhotoDimensions(rawDim);

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
    url,
    sha256,
    mimeType,
    dimensions: { width: dimensions.width, height: dimensions.height },
    blurhash,
    alt,
    summary,
    fallbackUrls: fallbackUrls.length > 0 ? fallbackUrls : undefined,
    exif,
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
    kind: NOSTR_KINDS.PHOTO_METADATA,
    eventId: event.id,
    createdAt: event.created_at,
  };
}

/**
 * Parses a Kind 20 (NIP-68 Picture Event) into an array of PhotoMetadata items.
 * Unpacks all NIP-92 imeta tags and associates them with the event's album coordinate (a tag).
 */
export function parsePictureEvent(
  event: NostrEvent,
  defaultCoordinate?: string,
): PhotoMetadata[] {
  if (event.kind !== NOSTR_KINDS.PICTURE_EVENT) {
    throw new Error(
      `Invalid event kind: expected ${NOSTR_KINDS.PICTURE_EVENT}, received ${event.kind}`,
    );
  }

  const pubkey = sanitizePubkey(event.pubkey);
  if (!pubkey) {
    throw new Error('Invalid author pubkey on Kind 20 picture event');
  }

  // Find album coordinate in 'a' tag
  let albumCoordinate: string | undefined;
  let title: string | undefined;

  for (const tag of event.tags) {
    if (!Array.isArray(tag) || tag.length < 2) continue;
    const [tagName, tagValue] = tag;
    if (tagName.toLowerCase() === 'a' && !albumCoordinate) {
      albumCoordinate = sanitizeCoordinate(tagValue) || undefined;
    } else if (tagName.toLowerCase() === 'title' && !title) {
      title = sanitizeText(tagValue, 200) || undefined;
    }
  }

  const resolvedCoordinate =
    albumCoordinate ||
    (defaultCoordinate ? sanitizeCoordinate(defaultCoordinate) : null) ||
    undefined;
  if (!resolvedCoordinate) {
    throw new Error(
      'Missing or invalid Event Album coordinate "a" tag in Kind 20 picture event',
    );
  }

  const eventContent = sanitizeText(event.content, 2000) || undefined;
  const photos: PhotoMetadata[] = [];
  let itemIndex = 0;

  for (const tag of event.tags) {
    if (!Array.isArray(tag) || tag.length < 2) continue;
    if (tag[0].toLowerCase() !== 'imeta') continue;

    try {
      const imeta = parseImetaTag(tag);
      const dimensions = parsePhotoDimensions(
        `${imeta.dimensions.width}x${imeta.dimensions.height}`,
      );

      const photoId = `${event.id}:${itemIndex}`;

      photos.push({
        id: photoId,
        pubkey,
        url: imeta.url,
        sha256: imeta.sha256,
        mimeType: imeta.mimeType || 'image/jpeg',
        dimensions,
        albumCoordinate: resolvedCoordinate,
        blurhash: imeta.blurhash,
        alt: imeta.alt || title,
        summary: imeta.summary || title || eventContent,
        exif: imeta.exif,
        kind: NOSTR_KINDS.PICTURE_EVENT,
        eventId: event.id,
        itemIndex,
        fallbackUrls: imeta.fallbackUrls,
        createdAt: event.created_at,
      });

      itemIndex++;
    } catch {
      // Skip malformed imeta tag
    }
  }

  return photos;
}

/**
 * Unified photo extractor supporting both Kind 1063 (NIP-94) and Kind 20 (NIP-68).
 */
export function extractPhotosFromEvent(
  event: NostrEvent,
  defaultCoordinate?: string,
): PhotoMetadata[] {
  if (event.kind === NOSTR_KINDS.PHOTO_METADATA) {
    return [parsePhotoEvent(event)];
  }
  if (event.kind === NOSTR_KINDS.PICTURE_EVENT) {
    return parsePictureEvent(event, defaultCoordinate);
  }
  throw new Error(
    `Unsupported photo event kind: ${event.kind}. Expected ${NOSTR_KINDS.PHOTO_METADATA} (1063) or ${NOSTR_KINDS.PICTURE_EVENT} (20)`,
  );
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

/**
 * Creates an unsigned EventTemplate for a Kind 20 (NIP-68 Picture Event)
 * containing multiple NIP-92 imeta tags for batch photo sharing.
 */
export function createPictureEventTemplate(
  params: PictureEventParams,
): EventTemplate {
  if (!params.items || params.items.length === 0) {
    throw new Error(
      'At least one photo item is required for a Kind 20 Picture Event',
    );
  }

  const coord = sanitizeCoordinate(params.albumCoordinate);
  if (!coord) {
    throw new Error('Valid Event Album coordinate is required');
  }

  const tags: string[][] = [['a', coord]];

  if (params.title?.trim()) {
    const cleanTitle = sanitizeText(params.title.trim(), 200);
    if (cleanTitle) {
      tags.push(['title', cleanTitle]);
    }
  }

  if (params.tags && params.tags.length > 0) {
    for (const t of params.tags) {
      const cleanTag = sanitizeText(t.trim(), 50);
      if (cleanTag && !tags.some(([k, v]) => k === 't' && v === cleanTag)) {
        tags.push(['t', cleanTag]);
      }
    }
  }

  // Append imeta tag for each item
  for (const item of params.items) {
    tags.push(serializeImetaTag(item));
  }

  return {
    kind: NOSTR_KINDS.PICTURE_EVENT,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: params.description?.trim() || '',
  };
}

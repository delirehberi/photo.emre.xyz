/**
 * Photo Deletion Request Helpers
 * photo.emre.xyz
 */

import { validateHexKey, validateNpub, pubkeyToNpub, npubToHex } from './keys';
import type { Locale } from '../i18n/dictionary';

export interface DeleteRequestData {
  photoHash?: string;
  photoUrl?: string;
  uploaderPubkey?: string;
  album?: string;
  reason?: 'likeness' | 'copyright' | 'privacy' | 'other' | string;
  additionalNotes?: string;
  locale?: Locale;
}

export interface ResolvedUploader {
  hex: string | null;
  npub: string | null;
  isValid: boolean;
}

export interface ClientLinks {
  primal: string;
  njump: string;
  coracle: string;
  native: string;
}

/**
 * Resolves a public key input (which may be 64-char hex or npub1...) into both hex and npub formats.
 */
export function resolveUploaderKey(input: string): ResolvedUploader {
  const clean = input.trim();
  if (!clean) {
    return { hex: null, npub: null, isValid: false };
  }

  // Case 1: Bech32 npub1...
  if (validateNpub(clean)) {
    try {
      const hex = npubToHex(clean);
      return { hex, npub: clean, isValid: true };
    } catch {
      return { hex: null, npub: null, isValid: false };
    }
  }

  // Case 2: 64-character lowercase/uppercase hex
  if (validateHexKey(clean)) {
    try {
      const hex = clean.toLowerCase();
      const npub = pubkeyToNpub(hex);
      return { hex, npub, isValid: true };
    } catch {
      return { hex: null, npub: null, isValid: false };
    }
  }

  return { hex: null, npub: null, isValid: false };
}

/**
 * Generates direct navigation and deep-link URLs for an npub across leading Nostr clients.
 */
export function getClientLinks(npub: string): ClientLinks {
  const cleanNpub = npub.trim();
  return {
    primal: `https://primal.net/p/${cleanNpub}`,
    njump: `https://njump.me/${cleanNpub}`,
    coracle: `https://coracle.social/${cleanNpub}`,
    native: `nostr:${cleanNpub}`,
  };
}

/**
 * Maps reason code to human-readable text for message generation.
 */
function getReasonText(reason: string | undefined, locale: Locale): string {
  if (locale === 'en') {
    switch (reason) {
      case 'likeness':
        return 'I appear in this photo and do not consent to its public display (Likeness & Privacy Rights).';
      case 'copyright':
        return 'I hold copyright over this work or it was captured without requisite permission.';
      case 'privacy':
        return 'Personal privacy / depiction of sensitive or private moments.';
      case 'other':
      default:
        return 'Personal request for photo removal.';
    }
  } else {
    switch (reason) {
      case 'likeness':
        return 'Bu fotoğrafta yer almaktayım ve yayınlanmasına açık rızam bulunmamaktadır (Kişisel Görüntü ve Mahremiyet Hakkı).';
      case 'copyright':
        return 'Bu görselin telif hakkı şahsıma aittir veya izinsiz çekilmiştir.';
      case 'privacy':
        return 'Kişisel mahremiyet / hassas durum içeren paylaşım.';
      case 'other':
      default:
        return 'Fotoğrafın kaldırılması talebi.';
    }
  }
}

/**
 * Builds a polite, cryptographically specific deletion request note to send to the uploader.
 */
export function buildDeleteRequestMessage(data: DeleteRequestData): string {
  const {
    photoHash,
    photoUrl,
    album,
    reason = 'likeness',
    additionalNotes,
    locale = 'tr',
  } = data;

  const reasonText = getReasonText(reason, locale);

  if (locale === 'en') {
    const lines = [
      'Hello,',
      '',
      'I am reaching out regarding an event photo uploaded via your Nostr key / Blossom media server on Phoem (photo.emre.xyz):',
      '',
    ];

    if (photoHash) {
      lines.push(`• Photo SHA-256: ${photoHash.trim()}`);
    }
    if (photoUrl) {
      lines.push(`• Media URL: ${photoUrl.trim()}`);
    }
    if (album) {
      lines.push(`• Event / Album: ${album.trim()}`);
    }

    lines.push(`• Reason: ${reasonText}`);

    if (additionalNotes && additionalNotes.trim()) {
      lines.push(`• Additional Notes: ${additionalNotes.trim()}`);
    }

    lines.push(
      '',
      'Under the Phoem platform policy and personal privacy / likeness rights, I kindly request that you remove this image from your Blossom server (using a signed Kind 24242 delete authorization) and retract its reference from the album event.',
      '',
      'Thank you for respecting attendee privacy and community trust.',
      'https://photo.emre.xyz/en/policy',
    );

    return lines.join('\n');
  } else {
    const lines = [
      'Merhaba,',
      '',
      'Phoem (photo.emre.xyz) üzerinden Nostr anahtarınız ve Blossom sunucunuz aracılığıyla yayınlanan bir etkinlik fotoğrafı hakkında sizinle iletişime geçiyorum:',
      '',
    ];

    if (photoHash) {
      lines.push(`• Fotoğraf SHA-256: ${photoHash.trim()}`);
    }
    if (photoUrl) {
      lines.push(`• Medya Bağlantısı: ${photoUrl.trim()}`);
    }
    if (album) {
      lines.push(`• Etkinlik / Albüm: ${album.trim()}`);
    }

    lines.push(`• Talep Nedeni: ${reasonText}`);

    if (additionalNotes && additionalNotes.trim()) {
      lines.push(`• Ek Açıklama: ${additionalNotes.trim()}`);
    }

    lines.push(
      '',
      'Phoem topluluk politikası ve kişisel görüntü/mahremiyet haklarım kapsamında, bu görseli Blossom sunucunuzdan (Kind 24242 imzalı silme ile) silmenizi ve etkinlik albümünden referansını kaldırmanızı rica ediyorum.',
      '',
      'Katılımcı mahremiyetine gösterdiğiniz özen ve anlayış için teşekkür ederim.',
      'https://photo.emre.xyz/policy',
    );

    return lines.join('\n');
  }
}

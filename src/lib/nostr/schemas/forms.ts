/**
 * Zod Form & Action Validation Schemas
 * photo.emre.xyz
 *
 * Provides type-safe runtime validation for:
 * - Event Album Creation (Kind 31922)
 * - Organization Profile Creation (Kind 0)
 * - Photo Upload Metadata (Kind 1063)
 */

import { z } from 'zod';

const urlOrEmpty = z
  .string()
  .trim()
  .refine((val) => !val || /^https?:\/\/.+/i.test(val), {
    message: 'Geçerli bir web adresi (https://...) giriniz.',
  });

const nip05OrEmpty = z
  .string()
  .trim()
  .refine((val) => !val || /^[\w.-]+@[\w.-]+\.[a-z]{2,}$/i.test(val), {
    message: 'Geçerli bir NIP-05 kimliği (ad@alanadi.com) giriniz.',
  });

const lud16OrEmpty = z
  .string()
  .trim()
  .refine((val) => !val || /^[\w.-]+@[\w.-]+\.[a-z]{2,}$/i.test(val), {
    message: 'Geçerli bir Lightning adresi (kullanici@alanadi.com) giriniz.',
  });

/**
 * Validation schema for Event Album Creation Form
 */
export const EventAlbumFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Etkinlik başlığı en az 3 karakter olmalıdır.')
    .max(120, 'Etkinlik başlığı en fazla 120 karakter olabilir.'),
  dTag: z
    .string()
    .trim()
    .min(2, 'Etkinlik kodu (slug) en az 2 karakter olmalıdır.')
    .max(64, 'Etkinlik kodu en fazla 64 karakter olabilir.')
    .regex(
      /^[a-z0-9-]+$/,
      'Etkinlik kodu yalnızca küçük harf, rakam ve tire (-) içerebilir.',
    ),
  summary: z
    .string()
    .trim()
    .min(5, 'Etkinlik özeti en az 5 karakter olmalıdır.')
    .max(500, 'Etkinlik özeti en fazla 500 karakter olabilir.'),
  description: z.string().trim().max(3000, 'Açıklama çok uzun.').optional(),
  location: z.string().trim().max(150, 'Konum çok uzun.').optional(),
  coverImage: urlOrEmpty.optional(),
  startDateStr: z.string().trim().optional(),
  endDateStr: z.string().trim().optional(),
  tags: z.string().trim().optional(),
});

export type EventAlbumFormValues = z.infer<typeof EventAlbumFormSchema>;

/**
 * Validation schema for Organization Profile Creation Form
 */
export const OrganizationFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Organizasyon adı en az 2 karakter olmalıdır.')
    .max(60, 'Organizasyon adı en fazla 60 karakter olabilir.')
    .regex(
      /^[a-z0-9_-]+$/i,
      'Organizasyon teknik adı yalnızca harf, rakam, tire ve alt çizgi içerebilir.',
    ),
  displayName: z
    .string()
    .trim()
    .max(100, 'Görünen ad en fazla 100 karakter olabilir.')
    .optional(),
  about: z
    .string()
    .trim()
    .max(2000, 'Açıklama en fazla 2000 karakter olabilir.')
    .optional(),
  picture: urlOrEmpty.optional(),
  banner: urlOrEmpty.optional(),
  website: urlOrEmpty.optional(),
  nip05: nip05OrEmpty.optional(),
  lud16: lud16OrEmpty.optional(),
});

export type OrganizationFormValues = z.infer<typeof OrganizationFormSchema>;

/**
 * Validation schema for Photo Upload Metadata
 */
export const PhotoUploadSchema = z.object({
  fileName: z.string().min(1, 'Dosya adı boş olamaz.'),
  fileSize: z
    .number()
    .positive('Dosya boyutu sıfırdan büyük olmalıdır.')
    .max(100 * 1024 * 1024, 'Dosya boyutu 100 MB sınırını aşamaz.'),
  mimeType: z
    .string()
    .refine(
      (m) => m.startsWith('image/'),
      'Sadece resim dosyaları yüklenebilir.',
    ),
  dimensions: z.object({
    width: z
      .number()
      .int()
      .positive('Genişlik pozitif bir tam sayı olmalıdır.'),
    height: z
      .number()
      .int()
      .positive('Yükseklik pozitif bir tam sayı olmalıdır.'),
  }),
  sha256: z
    .string()
    .regex(
      /^[a-f0-9]{64}$/i,
      'Geçerli bir 64 karakterli SHA-256 özeti gereklidir.',
    ),
  summary: z
    .string()
    .trim()
    .max(500, 'Fotoğraf açıklaması çok uzun.')
    .optional(),
});

export type PhotoUploadValues = z.infer<typeof PhotoUploadSchema>;

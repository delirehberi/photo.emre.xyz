/**
 * Event Album Creator Component
 * photo.emre.xyz
 *
 * Creates Kind 31922 event albums tagged with 'event-album' and broadcasts to relay mesh.
 */

import { useState, useRef, useEffect, type SyntheticEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Tag,
  MapPin,
  Image as ImageIcon,
  ImagePlus,
  X,
  UploadCloud,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/lib/nostr/auth/context';
import { createEventAlbumTemplate } from '@/lib/nostr/schemas/album';
import { createPhotoEventTemplate } from '@/lib/nostr/schemas/photo';
import {
  EventAlbumFormSchema,
  PhotoUploadSchema,
} from '@/lib/nostr/schemas/forms';
import { getSharedRelayPool } from '@/lib/nostr/pool';
import { DEFAULT_RELAYS } from '@/lib/nostr/config';
import { BlossomClient } from '@/lib/blossom/client';
import { calculateBlobSha256 } from '@/lib/blossom/hasher';
import { extractImageDimensions } from '@/lib/media/dimensions';
import { extractExifFromBlob } from '@/lib/media/exif';
import { BlossomServerSelector } from '@/components/blossom/BlossomServerSelector';
import { useBlossomServer } from '@/lib/blossom/useBlossomServer';
import type {
  NostrEvent,
  PhotoDimensions,
  PhotoExif,
  PhotoMetadata,
} from '@/lib/nostr/types';

interface RelayBroadcastResult {
  relay: string;
  success: boolean;
}

interface AttachedPhotoItem {
  id: string;
  file: File;
  name: string;
  size: number;
  thumbnailUrl: string;
  dimensions?: PhotoDimensions;
  sha256?: string;
  exif?: PhotoExif;
  status: 'hashing' | 'ready' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
}

/**
 * Converts a title string into a clean, URL-safe slug with Turkish/Unicode transliteration.
 */
export function slugify(text: string): string {
  const trMap: Record<string, string> = {
    ç: 'c',
    Ç: 'c',
    ğ: 'g',
    Ğ: 'g',
    ı: 'i',
    İ: 'i',
    ö: 'o',
    Ö: 'o',
    ş: 's',
    Ş: 's',
    ü: 'u',
    Ü: 'u',
  };
  return text
    .split('')
    .map((char) => trMap[char] || char)
    .join('')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function EventAlbumCreator() {
  const { signer } = useAuth();
  const { selectedServerUrl, setSelectedServerUrl } = useBlossomServer();

  // Form Fields
  const [title, setTitle] = useState('');
  const [dTag, setDTag] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [startDateStr, setStartDateStr] = useState('');
  const [endDateStr, setEndDateStr] = useState('');
  const [tagInput, setTagInput] = useState('speaking club, cosplay, community');

  // Attached Photos
  const [attachedPhotos, setAttachedPhotos] = useState<AttachedPhotoItem[]>([]);
  const [isDraggingPhotos, setIsDraggingPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission & Broadcast state
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastPhase, setBroadcastPhase] = useState<
    'idle' | 'event' | 'photos'
  >('idle');
  const [uploadedPhotosCount, setUploadedPhotosCount] = useState(0);
  const [broadcastResults, setBroadcastResults] = useState<
    RelayBroadcastResult[] | null
  >(null);
  const [publishedEvent, setPublishedEvent] = useState<NostrEvent | null>(null);
  const [publishedPhotos, setPublishedPhotos] = useState<PhotoMetadata[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(
    null,
  );

  // Automatic 4-second redirect to newly created event details page
  useEffect(() => {
    if (redirectCountdown === null || !publishedEvent) return;

    const targetDTag =
      publishedEvent.tags.find((t) => t[0] === 'd')?.[1] || dTag.trim();
    const targetUrl = `/album/${encodeURIComponent(targetDTag)}`;

    if (redirectCountdown <= 0) {
      if (typeof window !== 'undefined') {
        window.location.href = targetUrl;
      }
      return;
    }

    const timer = setTimeout(() => {
      setRedirectCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [redirectCountdown, publishedEvent, dTag]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    setDTag(slugify(val));
  };

  const processSelectedPhotos = async (files: FileList | File[]) => {
    const newItems: AttachedPhotoItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const thumbnailUrl = URL.createObjectURL(file);

      newItems.push({
        id,
        file,
        name: file.name,
        size: file.size,
        thumbnailUrl,
        status: 'hashing',
        progress: 0,
      });
    }

    setAttachedPhotos((prev) => [...prev, ...newItems]);

    for (const item of newItems) {
      try {
        const [sha256, dims, exif] = await Promise.all([
          calculateBlobSha256(item.file),
          extractImageDimensions(item.file).catch(() => ({
            width: 1920,
            height: 1080,
            aspectRatio: 1.7778,
          })),
          extractExifFromBlob(item.file).catch(() => undefined),
        ]);

        setAttachedPhotos((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? {
                  ...p,
                  sha256,
                  dimensions: dims,
                  exif: exif ?? undefined,
                  status: 'ready',
                }
              : p,
          ),
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Analiz başarısız';
        setAttachedPhotos((prev) =>
          prev.map((p) =>
            p.id === item.id ? { ...p, status: 'error', error: msg } : p,
          ),
        );
      }
    }
  };

  const handleRemovePhoto = (id: string) => {
    setAttachedPhotos((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item?.thumbnailUrl) {
        URL.revokeObjectURL(item.thumbnailUrl);
      }
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setBroadcastResults(null);
    setPublishedEvent(null);
    setPublishedPhotos([]);

    const effectiveDTag =
      dTag.trim() || slugify(title) || `event-${Date.now().toString(36)}`;

    const validationResult = EventAlbumFormSchema.safeParse({
      title,
      dTag: effectiveDTag,
      summary: summary.trim() || title.trim(),
      description,
      location,
      coverImage,
      startDateStr,
      endDateStr,
      tags: tagInput,
    });

    if (!validationResult.success) {
      const firstError =
        validationResult.error.issues[0]?.message ||
        'Lütfen form alanlarını kontrol ediniz.';
      setErrorMessage(firstError);
      return;
    }

    if (!signer || signer.type === 'readOnly') {
      setErrorMessage(
        'Etkinlik yayınlamak için aktif bir Nostr imzalayıcısı gereklidir.',
      );
      return;
    }

    setBroadcasting(true);
    setBroadcastPhase('event');

    try {
      const parsedStart = startDateStr
        ? Math.floor(new Date(startDateStr).getTime() / 1000)
        : undefined;
      const parsedEnd = endDateStr
        ? Math.floor(new Date(endDateStr).getTime() / 1000)
        : undefined;

      const customTags = tagInput
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      const allTags = Array.from(new Set(['event-album', ...customTags]));

      // Phase 1: Broadcast Event Album (Kind 31922) first
      const template = createEventAlbumTemplate({
        dTag: effectiveDTag,
        title: title.trim(),
        summary: summary.trim() || title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        coverImage: coverImage.trim() || undefined,
        startDate: parsedStart,
        endDate: parsedEnd,
        tags: allTags,
      });

      const signedEvent = await signer.signEvent(template);
      const poolManager = getSharedRelayPool();
      const { successfulRelays } = await poolManager.publishEvent(
        signedEvent,
        DEFAULT_RELAYS,
      );

      const results: RelayBroadcastResult[] = DEFAULT_RELAYS.map((relay) => ({
        relay,
        success: successfulRelays.includes(relay),
      }));

      setBroadcastResults(results);
      setPublishedEvent(signedEvent);

      // Phase 2: If photos are attached, upload each blob to Blossom and broadcast Kind 1063
      if (attachedPhotos.length > 0) {
        setBroadcastPhase('photos');
        setUploadedPhotosCount(0);

        const albumCoordinate = `31922:${signedEvent.pubkey}:${effectiveDTag}`;
        const blossom = new BlossomClient(selectedServerUrl);
        const uploadedList: PhotoMetadata[] = [];
        let failedPhotosCount = 0;

        for (let i = 0; i < attachedPhotos.length; i++) {
          const item = attachedPhotos[i];

          const photoValidation = PhotoUploadSchema.safeParse({
            fileName: item.name,
            fileSize: item.size,
            mimeType: item.file.type || 'image/jpeg',
            dimensions: item.dimensions || { width: 1920, height: 1080 },
            sha256: item.sha256 || '0'.repeat(64),
          });

          if (!photoValidation.success) {
            failedPhotosCount++;
            const valErrMsg =
              photoValidation.error.issues[0]?.message ||
              'Fotoğraf doğrulaması başarısız';
            setAttachedPhotos((prev) =>
              prev.map((p) =>
                p.id === item.id
                  ? { ...p, status: 'error', error: valErrMsg }
                  : p,
              ),
            );
            continue;
          }

          setAttachedPhotos((prev) =>
            prev.map((p) =>
              p.id === item.id
                ? { ...p, status: 'uploading', progress: 10 }
                : p,
            ),
          );

          try {
            const descriptor = await blossom.uploadBlob(item.file, {
              signer: (t) => signer.signEvent(t),
              onProgress: (p) => {
                setAttachedPhotos((prev) =>
                  prev.map((pItem) =>
                    pItem.id === item.id
                      ? { ...pItem, progress: p.percent }
                      : pItem,
                  ),
                );
              },
            });

            const photoTemplate = createPhotoEventTemplate({
              url: descriptor.url,
              sha256: descriptor.sha256,
              dimensions: item.dimensions || { width: 1920, height: 1080 },
              albumCoordinate,
              mimeType: item.file.type || 'image/jpeg',
              alt: item.name,
              summary: item.name.replace(/\.[^/.]+$/, ''),
              exif: item.exif,
            });

            const signedPhotoEvent = await signer.signEvent(photoTemplate);
            await poolManager.publishEvent(signedPhotoEvent, DEFAULT_RELAYS);

            uploadedList.push({
              id: signedPhotoEvent.id,
              pubkey: signedPhotoEvent.pubkey,
              url: descriptor.url,
              sha256: descriptor.sha256,
              mimeType: item.file.type || 'image/jpeg',
              dimensions: item.dimensions || {
                width: 1920,
                height: 1080,
                aspectRatio: 1.7778,
              },
              albumCoordinate,
              summary: item.name.replace(/\.[^/.]+$/, ''),
              createdAt: signedPhotoEvent.created_at,
            });

            setAttachedPhotos((prev) =>
              prev.map((p) =>
                p.id === item.id
                  ? { ...p, status: 'completed', progress: 100 }
                  : p,
              ),
            );
            setUploadedPhotosCount(i + 1);
          } catch (uploadErr) {
            failedPhotosCount++;
            const errMsg =
              uploadErr instanceof Error
                ? uploadErr.message
                : 'Yükleme başarısız';
            setAttachedPhotos((prev) =>
              prev.map((p) =>
                p.id === item.id ? { ...p, status: 'error', error: errMsg } : p,
              ),
            );
          }
        }

        setPublishedPhotos(uploadedList);

        // Handle success vs partial/full failure
        if (failedPhotosCount > 0) {
          setErrorMessage(
            `Etkinlik albümü başarıyla oluşturuldu fakat ${failedPhotosCount} fotoğraf Blossom sunucusuna aktarılamadı. Lütfen sunucu yetkilerini kontrol ediniz. Fotoğrafları daha sonra albüm sayfasından da ekleyebilirsiniz.`,
          );
        } else {
          // Smoothly scroll viewport to top and start 4-second redirect
          if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
          setRedirectCountdown(4);
        }
      } else {
        // No attached photos, scroll and redirect immediately
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        setRedirectCountdown(4);
      }

      // Invalidate edge cache for the new album and all listing directories
      const albumCoordinate = `31922:${signedEvent.pubkey}:${effectiveDTag}`;
      if (typeof window !== 'undefined') {
        try {
          const authTemplate = {
            kind: 27235,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
              ['u', `${window.location.origin}/api/cache/invalidate`],
              ['method', 'POST'],
            ],
            content: 'Invalidate edge cache for new event album',
          };
          const authEvent = await signer.signEvent(authTemplate);

          fetch('/api/cache/invalidate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              coordinate: albumCoordinate,
              paths: ['/', '/en', '/events', '/en/events'],
              authEvent,
            }),
          }).catch((invalErr) => {
            console.warn(
              'Edge cache invalidation background warning:',
              invalErr,
            );
          });
        } catch (invalErr) {
          console.warn(
            'Failed to sign edge cache invalidation auth event:',
            invalErr,
          );
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Yayınlama başarısız oldu: ${msg}`);
    } finally {
      setBroadcasting(false);
      setBroadcastPhase('idle');
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm">
      <div className="flex items-center gap-3 border-b border-zinc-100 pb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <Calendar className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-zinc-900">
            Yeni Etkinlik Albümü Oluştur
          </h2>
          <p className="text-xs text-zinc-500">
            Nostr röle ağına 'event-album' etiketli Kind 31922 takvim albümü
            yayınlar ve fotoğraflarınızı Blossom sunucusuna yükler.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {publishedEvent && broadcastResults && (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Etkinlik Albümü Başarıyla Yayınlandı!</span>
            </div>
            {redirectCountdown !== null && (
              <a
                href={`/album/${encodeURIComponent(publishedEvent.tags.find((t) => t[0] === 'd')?.[1] || dTag.trim())}`}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs w-fit"
              >
                <span>Hemen Git</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          {redirectCountdown !== null && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-100/90 border border-emerald-300/70 px-3 py-2 text-xs text-emerald-900 font-medium">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-700 shrink-0" />
              <span>
                <strong>{redirectCountdown}</strong> saniye içinde etkinlik
                detay sayfasına yönlendiriliyorsunuz...
              </span>
            </div>
          )}

          <div className="rounded-lg border border-zinc-200 bg-white p-3 space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Yazar Pubkey:</span>
              <span className="font-mono text-zinc-800">
                {publishedEvent.pubkey.slice(0, 16)}...
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Olay Kimliği:</span>
              <span className="font-mono text-zinc-800">
                {publishedEvent.id.slice(0, 16)}...
              </span>
            </div>
            {publishedPhotos.length > 0 && (
              <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
                <span className="text-zinc-500">Yüklenen Fotoğraflar:</span>
                <span className="font-semibold text-emerald-700">
                  {publishedPhotos.length} fotoğraf Blossom sunucusuna yüklendi
                </span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
              <span className="text-zinc-500">Albüm Bağlantısı:</span>
              <a
                href={`/album/${encodeURIComponent(publishedEvent.tags.find((t) => t[0] === 'd')?.[1] || dTag.trim())}`}
                className="text-amber-600 font-semibold hover:underline"
              >
                /album/
                {publishedEvent.tags.find((t) => t[0] === 'd')?.[1] ||
                  dTag.trim()}
              </a>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-zinc-100 text-xs">
              <span className="text-zinc-500">Kayıt Türü:</span>
              <span className="font-medium text-emerald-700">
                Beta: Ücretsiz
              </span>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <span className="text-xs font-medium text-zinc-700 block">
              Röle Yayılım Durumu:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs font-mono">
              {broadcastResults.map(({ relay, success }) => (
                <div
                  key={relay}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border ${
                    success
                      ? 'border-emerald-200 bg-emerald-100/50 text-emerald-900'
                      : 'border-zinc-200 bg-zinc-50 text-zinc-400'
                  }`}
                >
                  <span className="truncate mr-2">
                    {relay.replace('wss://', '')}
                  </span>
                  {success ? (
                    <Badge variant="official" className="text-[10px] px-1 py-0">
                      OK
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1 py-0 text-zinc-400"
                    >
                      Zaman Aşımı
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-xs">
        <div className="space-y-1">
          <label
            htmlFor="event-title"
            className="font-semibold text-zinc-800 block"
          >
            Etkinlik Başlığı *
          </label>
          <input
            id="event-title"
            type="text"
            required
            placeholder="Speaking Club & Cosplay Topluluk Buluşması 2026"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="event-summary"
            className="font-semibold text-zinc-800 block"
          >
            Kısa Özet *
          </label>
          <input
            id="event-summary"
            type="text"
            required
            placeholder="Üç günlük açık kaynak geliştirici maratonu ve atölyeler."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="event-description"
            className="font-semibold text-zinc-800 block"
          >
            Detaylı Açıklama
          </label>
          <textarea
            id="event-description"
            rows={3}
            placeholder="Etkinlik hakkında ayrıntılı bilgiler, sponsorlar ve program..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label
              htmlFor="event-location"
              className="font-semibold text-zinc-800 block flex items-center gap-1"
            >
              <MapPin className="h-3 w-3 text-zinc-400" />
              Konum / Şehir
            </label>
            <input
              id="event-location"
              type="text"
              placeholder="Berlin, Almanya"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="event-cover"
              className="font-semibold text-zinc-800 block flex items-center gap-1"
            >
              <ImageIcon className="h-3 w-3 text-zinc-400" />
              Kapak Görseli URL
            </label>
            <input
              id="event-cover"
              type="url"
              placeholder="https://media.emre.xyz/cover.jpg"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label
              htmlFor="event-start"
              className="font-semibold text-zinc-800 block"
            >
              Başlangıç Tarihi ve Saati
            </label>
            <input
              id="event-start"
              type="datetime-local"
              value={startDateStr}
              onChange={(e) => setStartDateStr(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="event-end"
              className="font-semibold text-zinc-800 block"
            >
              Bitiş Tarihi ve Saati
            </label>
            <input
              id="event-end"
              type="datetime-local"
              value={endDateStr}
              onChange={(e) => setEndDateStr(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="event-tags"
            className="font-semibold text-zinc-800 block flex items-center gap-1"
          >
            <Tag className="h-3 w-3 text-zinc-400" />
            Etiketler (Virgülle ayırın, 'event-album' otomatik eklenir)
          </label>
          <input
            id="event-tags"
            type="text"
            placeholder="speaking club, cosplay, community, istanbul"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white"
          />
        </div>

        {/* Photo Upload Attachment Zone */}
        <div className="space-y-2 pt-2 border-t border-zinc-100">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-zinc-800 block flex items-center gap-1.5">
              <UploadCloud className="h-4 w-4 text-amber-600" />
              Etkinlik Fotoğrafları Ekle (İsteğe Bağlı)
            </label>
            <span className="text-[11px] text-zinc-500">
              {attachedPhotos.length} fotoğraf seçildi
            </span>
          </div>
          <p className="text-[11px] text-zinc-500">
            Albüm oluşturulurken doğrudan fotoğraf yükleyebilirsiniz. Önce
            etkinlik albümü (Kind 31922) yayınlanacak, ardından fotoğraflar
            (Kind 1063) albüme bağlanarak Blossom'a yüklenecektir.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                processSelectedPhotos(e.target.files);
              }
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
            className="hidden"
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingPhotos(true);
            }}
            onDragLeave={() => setIsDraggingPhotos(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingPhotos(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                processSelectedPhotos(e.dataTransfer.files);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
              isDraggingPhotos
                ? 'border-amber-400 bg-amber-50/50'
                : 'border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100/50 hover:border-zinc-300'
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-1.5">
              <ImagePlus className="h-6 w-6 text-zinc-400" />
              <span className="text-xs font-medium text-zinc-700">
                Fotoğraf seçmek için tıklayın veya buraya sürükleyip bırakın
              </span>
              <span className="text-[11px] text-zinc-400">
                JPEG, PNG, WebP desteklenir
              </span>
            </div>
          </div>

          {/* Attached photos thumbnail preview */}
          {attachedPhotos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              {attachedPhotos.map((item) => (
                <div
                  key={item.id}
                  className="relative group rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100 aspect-16/10"
                >
                  <img
                    src={item.thumbnailUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Status overlays */}
                  {item.status === 'uploading' && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white text-[11px] gap-1 z-10">
                      <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                      <span className="font-mono text-[10px]">
                        {item.progress}%
                      </span>
                    </div>
                  )}
                  {item.status === 'completed' && (
                    <div className="absolute top-1.5 left-1.5 bg-emerald-600 text-white rounded-full p-0.5 shadow-xs z-10">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                  )}
                  {item.status === 'error' && (
                    <div className="absolute inset-0 bg-rose-950/80 flex flex-col items-center justify-center p-1 text-center text-rose-200 text-[10px] z-10">
                      <AlertCircle className="h-4 w-4 text-rose-400 mb-0.5" />
                      <span className="line-clamp-2 px-1 text-[9px]">
                        {item.error || 'Hata'}
                      </span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between p-1.5 z-20">
                    <span className="text-[10px] text-white truncate max-w-[80%]">
                      {item.name}
                    </span>
                    {!broadcasting && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePhoto(item.id);
                        }}
                        className="text-white hover:text-rose-400 p-0.5 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Blossom Media Server Selection for Cover & Attached Photos */}
        <BlossomServerSelector
          value={selectedServerUrl}
          onChange={setSelectedServerUrl}
          className="mt-4"
        />

        <Button
          type="submit"
          variant="default"
          size="default"
          className="w-full gap-2 mt-4 font-semibold shadow-xs h-auto min-h-11 py-3 px-4 text-xs sm:text-sm whitespace-normal text-center leading-snug break-words"
          disabled={broadcasting}
        >
          {broadcasting ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <Calendar className="h-4 w-4 shrink-0 text-amber-400" />
          )}
          <span>
            {broadcasting
              ? broadcastPhase === 'event'
                ? 'Etkinlik Albümü Yayınlanıyor (1/2)...'
                : `Fotoğraflar Yükleniyor (${uploadedPhotosCount}/${attachedPhotos.length})...`
              : 'Etkinlik Albümünü İmzala ve Yayınla (Beta: Ücretsiz)'}
          </span>
        </Button>
      </form>
    </div>
  );
}

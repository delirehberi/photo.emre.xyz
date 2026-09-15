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
  ListPlus,
  Link as LinkIcon,
  Search,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/lib/nostr/auth/context';
import {
  createEventAlbumTemplate,
  parseEventAlbum,
} from '@/lib/nostr/schemas/album';
import {
  parseCalendarList,
  createCalendarListTemplate,
  formatMonthDTag,
} from '@/lib/nostr/schemas/calendar';
import { createPhotoEventTemplate } from '@/lib/nostr/schemas/photo';
import {
  EventAlbumFormSchema,
  PhotoUploadSchema,
} from '@/lib/nostr/schemas/forms';
import { getSharedRelayPool } from '@/lib/nostr/pool';
import { DEFAULT_RELAYS, NOSTR_KINDS } from '@/lib/nostr/config';
import { encodeAlbumNaddr, resolveAlbumTarget } from '@/lib/nostr/identifiers';
import { formatEventDateTime } from '@/lib/nostr/events-data';
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
  EventAlbum,
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

  // Import Mode State (NIP-52 Calendar List Federated Integration)
  const [creationMode, setCreationMode] = useState<'create' | 'import'>(
    'create',
  );
  const [importInput, setImportInput] = useState('');
  const [isFetchingEvent, setIsFetchingEvent] = useState(false);
  const [fetchedEventAlbum, setFetchedEventAlbum] = useState<EventAlbum | null>(
    null,
  );
  const [importError, setImportError] = useState<string | null>(null);
  const [isAddingToList, setIsAddingToList] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<
    string | null
  >(null);

  const handleFetchImportEvent = async () => {
    const raw = importInput.trim();
    if (!raw) return;
    setIsFetchingEvent(true);
    setImportError(null);
    setFetchedEventAlbum(null);
    setImportSuccessMessage(null);

    try {
      const resolved = resolveAlbumTarget(raw);
      const pool = getSharedRelayPool();
      const targetRelays = Array.from(
        new Set([...DEFAULT_RELAYS, ...(resolved.relays || [])]),
      );
      const ev = await pool.queryOne(targetRelays, resolved.filter, {
        timeoutMs: 6000,
      });

      if (!ev) {
        throw new Error(
          'Etkinlik belirtilen rölelerde bulunamadı. Lütfen kimliği veya röleleri kontrol ediniz.',
        );
      }

      const parsed = parseEventAlbum(ev);
      setFetchedEventAlbum(parsed);
    } catch (err: unknown) {
      setImportError(
        err instanceof Error ? err.message : 'Etkinlik yüklenemedi.',
      );
    } finally {
      setIsFetchingEvent(false);
    }
  };

  const handleAddEventToCalendarList = async () => {
    if (!signer || signer.type === 'readOnly') {
      setImportError(
        'Etkinliği takvime eklemek için lütfen aktif bir Nostr anahtarıyla giriş yapınız.',
      );
      return;
    }
    if (!fetchedEventAlbum) return;

    setIsAddingToList(true);
    setImportError(null);

    try {
      const pool = getSharedRelayPool();
      const userPubkey = await signer.getPublicKey();
      const eventTimestamp =
        fetchedEventAlbum.startDate || fetchedEventAlbum.createdAt;
      const targetMonthDTag = formatMonthDTag(eventTimestamp);

      // Fetch existing Kind 31924 event for this user and month
      const existingListEvent = await pool.queryOne(
        DEFAULT_RELAYS,
        {
          kinds: [NOSTR_KINDS.CALENDAR_LIST],
          authors: [userPubkey],
          '#d': [targetMonthDTag],
        },
        { timeoutMs: 3500 },
      );

      let coordinates: string[] = [];
      let listTitle = `${targetMonthDTag.replace('events-', '')} Etkinlikleri`;
      let listDescription = 'Phoem topluluk etkinlik albümleri koleksiyonu';

      if (existingListEvent) {
        try {
          const parsedList = parseCalendarList(existingListEvent);
          coordinates = parsedList.coordinates;
          if (parsedList.title) listTitle = parsedList.title;
          if (parsedList.description) listDescription = parsedList.description;
        } catch {
          // ignore corrupted list
        }
      }

      if (!coordinates.includes(fetchedEventAlbum.coordinate)) {
        coordinates.push(fetchedEventAlbum.coordinate);
      }

      const template = createCalendarListTemplate({
        dTag: targetMonthDTag,
        title: listTitle,
        description: listDescription,
        coordinates,
      });

      const signed = await signer.signEvent(template);
      await pool.publishEvent(signed, DEFAULT_RELAYS);

      // Invalidate edge cache for events directory
      fetch('/api/cache/invalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coordinate: fetchedEventAlbum.coordinate,
          paths: ['/', '/en', '/events', '/en/events'],
        }),
      }).catch(() => {});

      const targetNaddr = encodeAlbumNaddr({
        kind: fetchedEventAlbum.kind,
        pubkey: fetchedEventAlbum.pubkey,
        dTag: fetchedEventAlbum.dTag,
      });

      setImportSuccessMessage(
        `"${fetchedEventAlbum.title}" etkinliği başarıyla ${targetMonthDTag} takvim listenize eklendi ve genel dizine yayınlandı!`,
      );

      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = `/album/${targetNaddr}`;
        }
      }, 2000);
    } catch (err: unknown) {
      setImportError(
        err instanceof Error
          ? err.message
          : 'Takvim listesi güncellenirken hata oluştu.',
      );
    } finally {
      setIsAddingToList(false);
    }
  };

  // Automatic 4-second redirect to newly created event details page
  useEffect(() => {
    if (redirectCountdown === null || !publishedEvent) return;

    const targetDTag =
      publishedEvent.tags.find((t) => t[0] === 'd')?.[1] || dTag.trim();
    let targetUrl = `/album/${encodeURIComponent(targetDTag)}`;
    try {
      const naddr = encodeAlbumNaddr({
        pubkey: publishedEvent.pubkey,
        dTag: targetDTag,
      });
      targetUrl = `/album/${naddr}`;
    } catch {
      // Fallback if encoding fails
    }

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
            {redirectCountdown !== null &&
              (() => {
                const targetDTag =
                  publishedEvent.tags.find((t) => t[0] === 'd')?.[1] ||
                  dTag.trim();
                const naddr = encodeAlbumNaddr({
                  pubkey: publishedEvent.pubkey,
                  dTag: targetDTag,
                });
                return (
                  <a
                    href={`/album/${naddr}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs w-fit"
                  >
                    <span>Hemen Git</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                );
              })()}
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
              <span className="text-zinc-500">Nostr naddr:</span>
              {(() => {
                const targetDTag =
                  publishedEvent.tags.find((t) => t[0] === 'd')?.[1] ||
                  dTag.trim();
                const naddr = encodeAlbumNaddr({
                  pubkey: publishedEvent.pubkey,
                  dTag: targetDTag,
                });
                return (
                  <a
                    href={`/album/${naddr}`}
                    className="text-amber-600 font-semibold font-mono hover:underline truncate max-w-[200px]"
                    title={naddr}
                  >
                    {naddr.slice(0, 16)}...{naddr.slice(-8)}
                  </a>
                );
              })()}
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

      {/* Mode Switcher Tabs */}
      <div className="flex rounded-xl bg-zinc-100 p-1 mt-6 mb-6">
        <button
          type="button"
          onClick={() => setCreationMode('create')}
          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
            creationMode === 'create'
              ? 'bg-white text-zinc-900 shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <Calendar className="h-4 w-4 text-amber-600" />
          <span>Yeni Albüm Oluştur</span>
        </button>
        <button
          type="button"
          onClick={() => setCreationMode('import')}
          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
            creationMode === 'import'
              ? 'bg-white text-zinc-900 shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <ListPlus className="h-4 w-4 text-amber-600" />
          <span>Nostr ID / Bağlantısı ile Ekle</span>
        </button>
      </div>

      {creationMode === 'import' ? (
        <div className="space-y-6 text-xs">
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-xs text-amber-900 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <span>Nostr Etkinliğini Albüm Dizini Takvimine Ekle</span>
            </div>
            <p className="text-zinc-600 leading-relaxed">
              Ditto, Coracle, Amethyst veya başka bir Nostr istemcisinde
              oluşturduğunuz etkinlikleri (Kind 31922 / 31923) etkinlik
              bağlantısı veya naddr kimliği ile doğrudan aylık takvim listenize
              ekleyin. Olay çoğaltılmaz; doğrudan orijinal etkinlik referans
              gösterilir.
            </p>
          </div>

          {importError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{importError}</span>
            </div>
          )}

          {importSuccessMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{importSuccessMessage}</span>
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="import-nostr-id"
              className="font-semibold text-zinc-800 block text-xs"
            >
              Nostr Etkinlik Bağlantısı veya Kimliği *
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  id="import-nostr-id"
                  type="text"
                  placeholder="https://ditto.pub/naddr1... veya naddr1..., nevent1..."
                  value={importInput}
                  onChange={(e) => setImportInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleFetchImportEvent();
                    }
                  }}
                  className="w-full pl-10 pr-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white"
                />
              </div>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleFetchImportEvent}
                disabled={isFetchingEvent || !importInput.trim()}
                className="gap-1.5 shrink-0"
              >
                {isFetchingEvent ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span>
                  {isFetchingEvent ? 'Aranıyor...' : 'Etkinliği Getir'}
                </span>
              </Button>
            </div>
            <p className="text-[11px] text-zinc-400">
              Örnek: https://ditto.pub/naddr1qvzqqqrukvpzq3hnc... veya naddr1...
            </p>
          </div>

          {fetchedEventAlbum && (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="official" className="text-[10px]">
                      {fetchedEventAlbum.kind === 31923
                        ? 'NIP-52 Zaman Bazlı (Kind 31923)'
                        : 'NIP-52 Tarih Bazlı (Kind 31922)'}
                    </Badge>
                    <span className="text-[11px] font-mono text-zinc-400 truncate max-w-[200px]">
                      d: {fetchedEventAlbum.dTag}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-zinc-900">
                    {fetchedEventAlbum.title}
                  </h3>
                  {fetchedEventAlbum.summary && (
                    <p className="text-xs text-zinc-600 line-clamp-2">
                      {fetchedEventAlbum.summary}
                    </p>
                  )}
                </div>

                {fetchedEventAlbum.coverImage && (
                  <img
                    src={fetchedEventAlbum.coverImage}
                    alt={fetchedEventAlbum.title}
                    className="h-20 w-32 object-cover rounded-xl border border-zinc-200 shrink-0"
                  />
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-600 pt-2 border-t border-zinc-200/80">
                {fetchedEventAlbum.startDate && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <span>
                      {formatEventDateTime(
                        fetchedEventAlbum.startDate,
                        'tr',
                        fetchedEventAlbum.endDate,
                      )}
                    </span>
                  </div>
                )}
                {fetchedEventAlbum.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <span className="truncate">
                      {fetchedEventAlbum.location}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 col-span-full">
                  <span className="text-zinc-400">Hedef Takvim Listesi:</span>
                  <span className="font-mono font-semibold text-zinc-800 bg-white px-2 py-0.5 rounded border border-zinc-200">
                    {formatMonthDTag(
                      fetchedEventAlbum.startDate ||
                        fetchedEventAlbum.createdAt,
                    )}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="text-[11px] text-zinc-500">
                  Etkinlik çoğaltılmayacak, doğrudan NIP-52 Kind 31924 listenize
                  eklenecektir.
                </div>
                <Button
                  type="button"
                  variant="default"
                  size="default"
                  onClick={handleAddEventToCalendarList}
                  disabled={isAddingToList}
                  className="gap-2 font-semibold shadow-xs"
                >
                  {isAddingToList ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ListPlus className="h-4 w-4 text-amber-400" />
                  )}
                  <span>
                    {isAddingToList
                      ? 'Takvime Ekleniyor...'
                      : 'Aylık Takvimime Ekle & Yayınla'}
                  </span>
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
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

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingPhotos(true);
              }}
              onDragLeave={() => setIsDraggingPhotos(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingPhotos(false);
                if (e.dataTransfer.files) {
                  processSelectedPhotos(e.dataTransfer.files);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 sm:p-6 text-center cursor-pointer transition-colors ${
                isDraggingPhotos
                  ? 'border-amber-500 bg-amber-50/50'
                  : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    processSelectedPhotos(e.target.files);
                  }
                }}
              />
              <div className="flex flex-col items-center justify-center gap-1.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <ImagePlus className="h-4 w-4" />
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-zinc-900">
                    Fotoğrafları buraya sürükleyin
                  </span>{' '}
                  <span className="text-zinc-500">veya dosya seçin</span>
                </div>
                <p className="text-[10px] text-zinc-400">
                  JPEG, PNG, WebP (Otomatik hash hesaplanır ve EXIF ayıklanır)
                </p>
              </div>
            </div>

            {/* Attached Photos Preview Grid */}
            {attachedPhotos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                {attachedPhotos.map((item) => (
                  <div
                    key={item.id}
                    className="group relative aspect-square rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100"
                  >
                    <img
                      src={item.thumbnailUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />

                    {/* Remove button */}
                    {!broadcasting && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePhoto(item.id);
                        }}
                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-zinc-900/70 hover:bg-zinc-900 text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer"
                        title="Kaldır"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}

                    {/* Status Overlay */}
                    {item.status === 'hashing' && (
                      <div className="absolute inset-0 bg-zinc-900/60 flex flex-col items-center justify-center text-white p-1 text-[10px]">
                        <Loader2 className="h-4 w-4 animate-spin mb-1 text-amber-400" />
                        <span>Analiz ediliyor...</span>
                      </div>
                    )}

                    {item.status === 'uploading' && (
                      <div className="absolute inset-0 bg-zinc-900/70 flex flex-col items-center justify-center text-white p-1 text-[10px]">
                        <Loader2 className="h-4 w-4 animate-spin mb-1 text-amber-400" />
                        <span>%{item.progress}</span>
                      </div>
                    )}

                    {item.status === 'completed' && (
                      <div className="absolute top-1 left-1">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-white" />
                      </div>
                    )}

                    {item.status === 'error' && (
                      <div className="absolute inset-0 bg-rose-900/70 flex flex-col items-center justify-center text-white p-1 text-[10px] text-center">
                        <AlertCircle className="h-4 w-4 text-rose-300 mb-0.5" />
                        <span className="line-clamp-2 px-1">
                          {item.error || 'Hata'}
                        </span>
                      </div>
                    )}

                    {/* Meta info badge */}
                    {item.dimensions && (
                      <div className="absolute bottom-1 left-1 bg-zinc-900/80 text-white text-[9px] px-1 rounded font-mono">
                        {item.dimensions.width}x{item.dimensions.height}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Blossom Server Selection */}
          {attachedPhotos.length > 0 && (
            <div className="pt-2 border-t border-zinc-100">
              <BlossomServerSelector
                value={selectedServerUrl}
                onChange={setSelectedServerUrl}
              />
            </div>
          )}

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
      )}
    </div>
  );
}

import { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { formatEventDateTime } from '@/lib/nostr/events-data';
import { encodeAlbumNaddr, resolveAlbumTarget } from '@/lib/nostr/identifiers';
import { getSharedRelayPool } from '@/lib/nostr/pool';
import { DEFAULT_RELAYS, NOSTR_KINDS } from '@/lib/nostr/config';
import { parseEventAlbum } from '@/lib/nostr/schemas/album';
import { parsePhotoEvent } from '@/lib/nostr/schemas/photo';
import { parseProfileEvent } from '@/lib/nostr/schemas/profile';
import { partitionPhotos } from '@/lib/nostr/partition';
import type {
  EventAlbum,
  PhotoMetadata,
  OrganizationProfile,
} from '@/lib/nostr/types';
import type { Locale } from '@/lib/i18n/dictionary';
import { MasonryGrid } from './MasonryGrid';
import { Lightbox } from './Lightbox';
import { UploadDrawer } from './UploadDrawer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AuthProvider, AuthContext, useAuth } from '@/lib/nostr/auth/context';
import { I18nProvider, useI18n, getLocalizedPath } from '@/lib/i18n/context';
import {
  parseCalendarList,
  createCalendarListTemplate,
  formatMonthDTag,
} from '@/lib/nostr/schemas/calendar';
import {
  ShieldCheck,
  Users,
  UploadCloud,
  Calendar,
  MapPin,
  Layers,
  Sparkles,
  ArrowLeft,
  Building2,
  Share2,
  Check,
  AlertCircle,
  RefreshCw,
  ListPlus,
} from 'lucide-react';

export interface DualSectionGalleryProps {
  album?: EventAlbum | null;
  officialPhotos?: PhotoMetadata[];
  communityPhotos?: PhotoMetadata[];
  organizerProfile?: OrganizationProfile | null;
  initialPhotoHash?: string | null;
  initialLocale?: Locale;
  initialLoading?: boolean;
  targetId?: string;
}

function DualSectionGalleryContent({
  album: initialAlbum,
  officialPhotos: initialOfficial = [],
  communityPhotos: initialCommunity = [],
  organizerProfile: initialOrganizer,
  initialPhotoHash,
  initialLoading = false,
  targetId,
}: DualSectionGalleryProps) {
  const { user, signer } = useAuth();
  const { t, locale } = useI18n();

  const [loading, setLoading] = useState(initialLoading || !initialAlbum);
  const [currentAlbum, setCurrentAlbum] = useState<EventAlbum | null>(
    initialAlbum || null,
  );
  const [organizerProfile, setOrganizerProfile] =
    useState<OrganizationProfile | null>(initialOrganizer || null);
  const [official, setOfficial] = useState<PhotoMetadata[]>(initialOfficial);
  const [community, setCommunity] = useState<PhotoMetadata[]>(initialCommunity);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isAddingToList, setIsAddingToList] = useState(false);
  const [addedToList, setAddedToList] = useState(false);

  const handleAddToList = async () => {
    if (!signer || !currentAlbum) return;
    setIsAddingToList(true);
    try {
      const pool = getSharedRelayPool();
      const userPubkey = await signer.getPublicKey();
      const timestamp = currentAlbum.startDate || currentAlbum.createdAt;
      const targetMonthDTag = formatMonthDTag(timestamp);

      const existingListEvent = await pool.queryOne(
        DEFAULT_RELAYS,
        {
          kinds: [NOSTR_KINDS.CALENDAR_LIST],
          authors: [userPubkey],
          '#d': [targetMonthDTag],
        },
        { timeoutMs: 3000 },
      );

      let coordinates: string[] = [];
      let listTitle = `${targetMonthDTag.replace('events-', '')} Etkinlikleri`;
      let listDescription = 'Phoem topluluk etkinlik albümleri koleksiyonu';

      if (existingListEvent) {
        try {
          const parsed = parseCalendarList(existingListEvent);
          coordinates = parsed.coordinates;
          if (parsed.title) listTitle = parsed.title;
          if (parsed.description) listDescription = parsed.description;
        } catch {
          // ignore corrupted list
        }
      }

      if (!coordinates.includes(currentAlbum.coordinate)) {
        coordinates.push(currentAlbum.coordinate);
      }

      const template = createCalendarListTemplate({
        dTag: targetMonthDTag,
        title: listTitle,
        description: listDescription,
        coordinates,
      });

      const signed = await signer.signEvent(template);
      await pool.publishEvent(signed, DEFAULT_RELAYS);
      setAddedToList(true);
      setTimeout(() => setAddedToList(false), 3000);
    } catch (err) {
      console.warn('Could not add event to user calendar list:', err);
    } finally {
      setIsAddingToList(false);
    }
  };

  const isOrganizer =
    user &&
    currentAlbum &&
    user.pubkey.toLowerCase() === currentAlbum.pubkey.toLowerCase();

  const [activeTab, setActiveTab] = useState<'official' | 'community'>(
    'official',
  );

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activePhoto, setActivePhoto] = useState<PhotoMetadata | null>(null);

  // Upload Drawer state
  const [uploadDrawerOpen, setUploadDrawerOpen] = useState(false);

  // Client-side live relay query when SSR was cold or pending
  const loadLiveAlbum = useCallback(async () => {
    if (!targetId) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    setLoading(true);
    setNotFound(false);

    try {
      const resolved = resolveAlbumTarget(targetId);
      const targetRelays = Array.from(
        new Set([...DEFAULT_RELAYS, ...(resolved.relays || [])]),
      );

      const pool = getSharedRelayPool();
      const albumEvent = await pool.queryOne(targetRelays, resolved.filter, {
        timeoutMs: 6000,
      });

      if (!albumEvent) {
        setLoading(false);
        setNotFound(true);
        return;
      }

      const parsedAlbum = parseEventAlbum(albumEvent);
      setCurrentAlbum(parsedAlbum);

      // Fetch Kind 1063 photos referencing this coordinate
      const photoEvents = await pool.queryEvents(
        targetRelays,
        {
          kinds: [NOSTR_KINDS.PHOTO_METADATA],
          '#a': [parsedAlbum.coordinate],
        },
        { timeoutMs: 4000 },
      );

      const parsedPhotos: PhotoMetadata[] = [];
      for (const pe of photoEvents) {
        try {
          parsedPhotos.push(parsePhotoEvent(pe));
        } catch {
          // Discard invalid photo events
        }
      }

      const partitioned = partitionPhotos(parsedPhotos, parsedAlbum.pubkey);
      setOfficial(partitioned.official);
      setCommunity(partitioned.community);

      // Fetch Kind 0 Organizer Profile
      const profileEv = await pool.queryOne(
        targetRelays,
        {
          kinds: [NOSTR_KINDS.METADATA],
          authors: [parsedAlbum.pubkey],
        },
        { timeoutMs: 3000 },
      );

      if (profileEv) {
        try {
          setOrganizerProfile(parseProfileEvent(profileEv));
        } catch {
          // Discard invalid profile
        }
      }

      setLoading(false);
    } catch (err) {
      console.warn('Client-side relay query error:', err);
      setLoading(false);
      setNotFound(true);
    }
  }, [targetId]);

  useEffect(() => {
    if (!currentAlbum && (initialLoading || targetId)) {
      loadLiveAlbum();
    }
  }, [currentAlbum, initialLoading, targetId, loadLiveAlbum]);

  // Combined photo list for full gallery navigation in Lightbox
  const allPhotos = useMemo(() => {
    return [...official, ...community];
  }, [official, community]);

  // Deep-link resolution: check URL query parameter ?photo=<hash> on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hashToFind =
      initialPhotoHash ||
      new URLSearchParams(window.location.search).get('photo');

    if (hashToFind && allPhotos.length > 0) {
      const match = allPhotos.find(
        (p) => p.sha256.toLowerCase() === hashToFind.toLowerCase(),
      );
      if (match) {
        setActivePhoto(match);
        setLightboxOpen(true);
      }
    }
  }, [initialPhotoHash, allPhotos]);

  const handlePhotoClick = useCallback((photo: PhotoMetadata) => {
    setActivePhoto(photo);
    setLightboxOpen(true);
  }, []);

  // Callback when new photos are uploaded via UploadDrawer
  const handleUploadSuccess = useCallback(
    (newPhotos: PhotoMetadata[]) => {
      if (!currentAlbum) return;

      const newOfficial: PhotoMetadata[] = [];
      const newCommunity: PhotoMetadata[] = [];

      for (const p of newPhotos) {
        if (p.pubkey.toLowerCase() === currentAlbum.pubkey.toLowerCase()) {
          newOfficial.push(p);
        } else {
          newCommunity.push(p);
        }
      }

      if (newOfficial.length > 0) {
        setOfficial((prev) => [...newOfficial, ...prev]);
      }
      if (newCommunity.length > 0) {
        setCommunity((prev) => [...newCommunity, ...prev]);
      }
    },
    [currentAlbum],
  );

  // Copy canonical naddr to clipboard
  const handleCopyNaddr = useCallback(() => {
    if (!currentAlbum) return;
    try {
      const naddr = encodeAlbumNaddr(currentAlbum);
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(naddr);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.warn('Could not copy naddr:', err);
    }
  }, [currentAlbum]);

  // Render loading animation skeleton
  if (loading) {
    return (
      <div
        className="w-full space-y-8 animate-pulse"
        aria-busy="true"
        aria-label="Etkinlik albümü rölelerden yükleniyor"
      >
        <div>
          <div className="h-4 w-36 bg-zinc-200 rounded-md" />
        </div>

        {/* Album Header Skeleton */}
        <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <div className="h-5 w-40 bg-amber-100 rounded-full" />
              <div className="h-5 w-24 bg-zinc-100 rounded-full" />
              <div className="h-5 w-20 bg-zinc-100 rounded-full" />
            </div>
            <div className="h-8 sm:h-10 w-3/4 max-w-xl bg-zinc-200 rounded-xl" />
            <div className="h-4 w-full max-w-lg bg-zinc-100 rounded-md" />
            <div className="flex flex-wrap gap-4 pt-2">
              <div className="h-4 w-32 bg-zinc-100 rounded-md" />
              <div className="h-4 w-44 bg-zinc-100 rounded-md" />
              <div className="h-4 w-24 bg-zinc-100 rounded-md" />
            </div>
          </div>

          <div className="pt-5 border-t border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-zinc-200" />
              <div className="space-y-1.5">
                <div className="h-3 w-20 bg-zinc-100 rounded-sm" />
                <div className="h-4 w-36 bg-zinc-200 rounded-sm" />
              </div>
            </div>
            <div className="h-8 w-28 bg-zinc-100 rounded-lg hidden sm:block" />
          </div>
        </div>

        {/* Tab & Gallery Skeletons */}
        <div className="space-y-6">
          <div className="h-10 w-64 bg-zinc-200/80 rounded-xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="aspect-4/3 bg-zinc-200/60 rounded-2xl shadow-xs"
                style={{ animationDelay: `${i * 75}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Render empty / not found state
  if (notFound || !currentAlbum) {
    return (
      <div className="w-full space-y-8">
        <div>
          <a
            href={getLocalizedPath('/events', locale)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t.album.backToEvents || 'Tüm Etkinliklere Dön'}
          </a>
        </div>

        <div className="rounded-3xl border border-dashed border-zinc-200 bg-white p-12 text-center shadow-xs space-y-5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
              {locale === 'en'
                ? 'Album Not Found'
                : 'Etkinlik Albümü Bulunamadı'}
            </h2>
            <p className="mx-auto max-w-md text-xs text-zinc-500 leading-relaxed">
              {locale === 'en'
                ? 'The requested Nostr event album could not be resolved from the connected relays. It may not exist or the author may have published it to different relays.'
                : 'İstenen Nostr etkinlik albümü bağlı rölelerde bulunamadı. Etkinlik silinmiş olabilir veya farklı rölelere yayınlanmış olabilir.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadLiveAlbum}
              className="gap-2 text-xs border-zinc-200"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>{locale === 'en' ? 'Retry Relays' : 'Yeniden Dene'}</span>
            </Button>
            <a
              href={getLocalizedPath('/events', locale)}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-semibold transition-colors bg-zinc-900 text-zinc-50 hover:bg-zinc-800 h-8 px-3 shadow-xs"
            >
              {locale === 'en' ? 'Browse All Events' : 'Tüm Etkinlikleri Gör'}
            </a>
          </div>
        </div>
      </div>
    );
  }

  const formattedStartDate = currentAlbum.startDate
    ? formatEventDateTime(currentAlbum.startDate, locale, currentAlbum.endDate)
    : '';

  return (
    <div className="w-full space-y-8">
      {/* Navigation Breadcrumb */}
      <div>
        <a
          href={getLocalizedPath('/events', locale)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t.album.backToEvents}
        </a>
      </div>

      {/* Album Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 min-w-0 flex-1">
            {/* Category Tags */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-amber-500/30 bg-amber-50 text-amber-900 hover:bg-amber-100/80 text-xs font-semibold"
              >
                <ShieldCheck className="w-3.5 h-3.5 mr-1 text-amber-600" />
                Nostr Etkinlik Albümü
              </Badge>

              {currentAlbum.tags
                ?.filter((t) => t !== 'event-album')
                .map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-xs font-normal text-zinc-600 border-zinc-200"
                  >
                    #{tag}
                  </Badge>
                ))}
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight">
              {currentAlbum.title}
            </h1>

            {currentAlbum.summary && (
              <p className="text-sm sm:text-base text-zinc-600 max-w-2xl leading-relaxed">
                {currentAlbum.summary}
              </p>
            )}

            {/* Event Dates & Location */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 pt-1">
              {formattedStartDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  {formattedStartDate}
                </span>
              )}
              {currentAlbum.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                  {currentAlbum.location}
                </span>
              )}
              <span className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-500">
                <Layers className="w-3.5 h-3.5" />
                {official.length + community.length} Fotoğraf
              </span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="default"
              onClick={handleCopyNaddr}
              className="gap-2 border-zinc-200 text-zinc-700 hover:bg-zinc-100 shadow-xs text-xs font-semibold"
              title="Nostr Paylaş / Copy naddr"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">
                    {locale === 'en' ? 'Copied naddr!' : 'naddr Kopyalandı!'}
                  </span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-amber-500" />
                  <span>
                    {locale === 'en' ? 'Share naddr' : 'Nostr Paylaş (naddr)'}
                  </span>
                </>
              )}
            </Button>

            {user && (
              <Button
                variant="outline"
                size="default"
                onClick={handleAddToList}
                disabled={isAddingToList}
                className="gap-2 text-xs border-zinc-200 hover:bg-zinc-50 font-medium"
              >
                {addedToList ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">
                      {locale === 'en' ? 'In Calendar List' : 'Listeme Eklendi'}
                    </span>
                  </>
                ) : (
                  <>
                    <ListPlus className="w-4 h-4 text-amber-500" />
                    <span>
                      {isAddingToList
                        ? locale === 'en'
                          ? 'Adding...'
                          : 'Ekleniyor...'
                        : locale === 'en'
                          ? 'Add to Calendar'
                          : 'Listeme Ekle'}
                    </span>
                  </>
                )}
              </Button>
            )}

            <Button
              variant="default"
              size="default"
              onClick={() => setUploadDrawerOpen(true)}
              className="gap-2 shadow-xs font-semibold text-xs"
            >
              {isOrganizer ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Resmi Fotoğraf Ekle</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 text-amber-400" />
                  <span>Fotoğraf Yükle</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Organizer Attribution */}
        <div className="mt-6 pt-5 border-t border-zinc-100 flex items-center justify-between gap-3 text-xs text-zinc-600">
          <a
            href={getLocalizedPath(`/org/${currentAlbum.pubkey}`, locale)}
            className="group flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            {organizerProfile?.picture ? (
              <img
                src={organizerProfile.picture}
                alt={organizerProfile.displayName || organizerProfile.name}
                className="h-8 w-8 rounded-full border border-zinc-200 object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-amber-600">
                <Building2 className="w-4 h-4" />
              </div>
            )}
            <div>
              <span className="text-zinc-400 block text-[11px]">
                {t.album.organizedBy || 'Düzenleyen Organizasyon:'}
              </span>
              <span className="font-semibold text-zinc-900 group-hover:text-amber-600 transition-colors">
                {organizerProfile?.displayName ||
                  organizerProfile?.name ||
                  `Organizasyon (${currentAlbum.pubkey.slice(0, 8)}...)`}
              </span>
              {organizerProfile?.nip05 && (
                <span className="ml-1.5 text-amber-600 font-mono text-[11px]">
                  ({organizerProfile.nip05})
                </span>
              )}
            </div>
          </a>

          <a
            href={getLocalizedPath(`/org/${currentAlbum.pubkey}`, locale)}
            className="text-xs text-zinc-500 hover:text-zinc-900 font-medium hidden sm:inline-flex items-center gap-1"
          >
            {locale === 'en'
              ? 'View Organization Profile →'
              : 'Organizasyon Profilini Gör →'}
          </a>
        </div>
      </div>

      {/* Dual Section Tabs: Official Gallery vs Community Submissions */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'official' | 'community')}
        className="w-full"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-3">
          <TabsList className="grid w-full sm:w-auto grid-cols-2">
            <TabsTrigger value="official" className="gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>{t.album.officialTab}</span>
              <Badge
                variant="secondary"
                className="ml-1 px-1.5 py-0 text-[10px] bg-zinc-100 text-zinc-700 border-zinc-200"
              >
                {official.length}
              </Badge>
            </TabsTrigger>

            <TabsTrigger value="community" className="gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>{t.album.communityTab}</span>
              <Badge
                variant="secondary"
                className="ml-1 px-1.5 py-0 text-[10px] bg-zinc-100 text-zinc-700 border-zinc-200"
              >
                {community.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{t.album.zeroClsNote}</span>
          </div>
        </div>

        {/* Section 1: Official Gallery */}
        <TabsContent
          value="official"
          className="mt-6 focus-visible:outline-none"
        >
          <div className="mb-4">
            <p className="text-xs text-zinc-500">{t.album.officialDesc}</p>
          </div>
          <MasonryGrid
            photos={official}
            organizerPubkey={currentAlbum.pubkey}
            isCommunity={false}
            onPhotoClick={handlePhotoClick}
            emptyTitle={t.album.noOfficialPhotos}
            emptyDescription={t.album.noOfficialDesc}
          />
        </TabsContent>

        {/* Section 2: Community Uploads */}
        <TabsContent
          value="community"
          className="mt-6 focus-visible:outline-none"
        >
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs text-zinc-500">{t.album.communityDesc}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUploadDrawerOpen(true)}
              className="text-xs gap-1.5 border-zinc-200"
            >
              <UploadCloud className="w-3.5 h-3.5 text-indigo-600" />
              {t.album.contributePhotos}
            </Button>
          </div>
          <MasonryGrid
            photos={community}
            organizerPubkey={currentAlbum.pubkey}
            isCommunity={true}
            onPhotoClick={handlePhotoClick}
            emptyTitle={t.album.noCommunityPhotos}
            emptyDescription={t.album.noCommunityDesc}
          />
        </TabsContent>
      </Tabs>

      {/* Lightbox Modal */}
      <Lightbox
        photos={allPhotos}
        activePhoto={activePhoto}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        organizerPubkey={currentAlbum.pubkey}
        albumTitle={currentAlbum.title}
      />

      {/* Mobile/Desktop Upload Drawer */}
      <UploadDrawer
        albumCoordinate={currentAlbum.coordinate}
        organizerPubkey={currentAlbum.pubkey}
        albumTitle={currentAlbum.title}
        open={uploadDrawerOpen}
        onOpenChange={setUploadDrawerOpen}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
}

export function DualSectionGallery(props: DualSectionGalleryProps) {
  const existingContext = useContext(AuthContext);
  const content = <DualSectionGalleryContent {...props} />;
  const withAuth = existingContext ? (
    content
  ) : (
    <AuthProvider>{content}</AuthProvider>
  );

  return (
    <I18nProvider initialLocale={props.initialLocale}>{withAuth}</I18nProvider>
  );
}

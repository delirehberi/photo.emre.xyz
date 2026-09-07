import { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { formatEventDateTime } from '@/lib/nostr/events-data';
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
  ShieldCheck,
  Users,
  UploadCloud,
  Calendar,
  MapPin,
  Layers,
  Sparkles,
  ArrowLeft,
  Building2,
} from 'lucide-react';

export interface DualSectionGalleryProps {
  album: EventAlbum;
  officialPhotos: PhotoMetadata[];
  communityPhotos: PhotoMetadata[];
  organizerProfile?: OrganizationProfile | null;
  initialPhotoHash?: string | null;
  initialLocale?: Locale;
}

function DualSectionGalleryContent({
  album,
  officialPhotos: initialOfficial,
  communityPhotos: initialCommunity,
  organizerProfile,
  initialPhotoHash,
}: DualSectionGalleryProps) {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const isOrganizer =
    user && user.pubkey.toLowerCase() === album.pubkey.toLowerCase();

  const [official, setOfficial] = useState<PhotoMetadata[]>(initialOfficial);
  const [community, setCommunity] = useState<PhotoMetadata[]>(initialCommunity);
  const [activeTab, setActiveTab] = useState<'official' | 'community'>(
    'official',
  );

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activePhoto, setActivePhoto] = useState<PhotoMetadata | null>(null);

  // Upload Drawer state
  const [uploadDrawerOpen, setUploadDrawerOpen] = useState(false);

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
      const newOfficial: PhotoMetadata[] = [];
      const newCommunity: PhotoMetadata[] = [];

      for (const p of newPhotos) {
        if (p.pubkey.toLowerCase() === album.pubkey.toLowerCase()) {
          newOfficial.push(p);
        } else {
          newCommunity.push(p);
        }
      }

      if (newOfficial.length > 0) {
        setOfficial((prev) => [...newOfficial, ...prev]);
        setActiveTab('official');
      }

      if (newCommunity.length > 0) {
        setCommunity((prev) => [...newCommunity, ...prev]);
        if (newOfficial.length === 0) {
          setActiveTab('community');
        }
      }
    },
    [album.pubkey],
  );

  const formattedStartDate = album.startDate
    ? formatEventDateTime(album.startDate, locale, album.endDate)
    : null;

  return (
    <div className="w-full space-y-8">
      {/* Back button */}
      <div>
        <a
          href="/events"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t.events.backToAllEvents}
        </a>
      </div>

      {/* Album Header Banner & Metadata */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="official" className="text-xs">
                <ShieldCheck className="w-3.5 h-3.5 mr-1 text-amber-600" />
                {t.locale === 'en'
                  ? 'Nostr Event Album'
                  : 'Nostr Etkinlik Albümü'}
              </Badge>
              {album.tags
                .filter((t) => t !== 'event-album')
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
              {album.title}
            </h1>

            {album.summary && (
              <p className="text-sm sm:text-base text-zinc-600 max-w-2xl leading-relaxed">
                {album.summary}
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
              {album.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                  {album.location}
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
              variant="default"
              size="default"
              onClick={() => setUploadDrawerOpen(true)}
              className="gap-2 shadow-xs font-semibold"
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

        {/* Organizer Attribution (Clickable linking to /org/[pubkey]) */}
        <div className="mt-6 pt-5 border-t border-zinc-100 flex items-center justify-between gap-3 text-xs text-zinc-600">
          <a
            href={getLocalizedPath(`/org/${album.pubkey}`, locale)}
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
                  `Organizasyon (${album.pubkey.slice(0, 8)}...)`}
              </span>
              {organizerProfile?.nip05 && (
                <span className="ml-1.5 text-amber-600 font-mono text-[11px]">
                  ({organizerProfile.nip05})
                </span>
              )}
            </div>
          </a>

          <a
            href={getLocalizedPath(`/org/${album.pubkey}`, locale)}
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
            organizerPubkey={album.pubkey}
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
            organizerPubkey={album.pubkey}
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
        organizerPubkey={album.pubkey}
        albumTitle={album.title}
      />

      {/* Mobile/Desktop Upload Drawer */}
      <UploadDrawer
        albumCoordinate={album.coordinate}
        organizerPubkey={album.pubkey}
        albumTitle={album.title}
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

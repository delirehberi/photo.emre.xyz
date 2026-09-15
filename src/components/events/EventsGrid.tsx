/**
 * Interactive Events Grid Component
 * photo.emre.xyz
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  formatEventDateTime,
  fetchEventAlbums,
  type EventWithOrg,
} from '@/lib/nostr/events-data';
import { encodeAlbumNaddr } from '@/lib/nostr/identifiers';
import { I18nProvider, useI18n, getLocalizedPath } from '@/lib/i18n/context';
import type { Locale } from '@/lib/i18n/dictionary';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  MapPin,
  Camera,
  Search,
  ArrowRight,
  ShieldCheck,
  Building2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { getThumbnailUrl } from '@/lib/media';

interface EventsGridProps {
  initialEvents: EventWithOrg[];
  initialLocale?: Locale;
}

function EventsGridContent({
  initialEvents,
}: {
  initialEvents: EventWithOrg[];
}) {
  const { t, locale } = useI18n();
  const [events, setEvents] = useState<EventWithOrg[]>(initialEvents);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const liveEvents = await fetchEventAlbums();
      if (liveEvents && liveEvents.length > 0) {
        setEvents(liveEvents);
      }
    } catch (err) {
      console.warn('Client relay refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Sync state if props change
  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  // Client-side fallback: if initial SSR events were empty, attempt client relay query
  useEffect(() => {
    if (initialEvents.length === 0) {
      handleRefresh();
    }
  }, [initialEvents.length, handleRefresh]);

  // Dynamically collect unique event tags across all albums (excluding internal tags)
  const dynamicTags = useMemo(() => {
    const coreCategoryTags = new Set([
      'all',
      'event-album',
      'speaking club',
      'speaking-club',
      'speakingclub',
      'speaking_club',
      'cosplay',
      'community',
      'topluluk',
    ]);
    const gathered = new Set<string>();

    for (const item of events) {
      for (const tag of item.album.tags) {
        const clean = tag.trim().toLowerCase();
        if (clean && !coreCategoryTags.has(clean)) {
          gathered.add(clean);
        }
      }
    }

    return Array.from(gathered).sort();
  }, [events]);

  // Core categories + dynamic event tags
  const filterButtons = useMemo(() => {
    const buttons = [
      { id: 'all', label: t.events.filterAll },
      { id: 'speaking-club', label: t.events.filterSpeakingClub },
      { id: 'cosplay', label: t.events.filterCosplay },
      { id: 'community', label: t.events.filterCommunity },
    ];

    for (const tag of dynamicTags) {
      buttons.push({
        id: tag,
        label: `#${tag}`,
      });
    }

    return buttons;
  }, [t, dynamicTags]);

  const filteredEvents = useMemo(() => {
    return events.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.album.title.toLowerCase().includes(q) ||
        item.album.summary.toLowerCase().includes(q) ||
        (item.album.location &&
          item.album.location.toLowerCase().includes(q)) ||
        (item.org?.displayName &&
          item.org.displayName.toLowerCase().includes(q)) ||
        item.album.tags.some((tag) => tag.toLowerCase().includes(q));

      let matchesTag = false;
      if (selectedTag === 'all') {
        matchesTag = true;
      } else if (selectedTag === 'speaking-club') {
        matchesTag = item.album.tags.some((tag) => {
          const lower = tag.toLowerCase();
          return (
            lower === 'speaking club' ||
            lower === 'speaking-club' ||
            lower === 'speakingclub' ||
            lower === 'speaking_club' ||
            lower.includes('speaking')
          );
        });
      } else if (selectedTag === 'cosplay') {
        matchesTag = item.album.tags.some((tag) =>
          tag.toLowerCase().includes('cosplay'),
        );
      } else if (selectedTag === 'community') {
        matchesTag = item.album.tags.some((tag) => {
          const lower = tag.toLowerCase();
          return lower === 'community' || lower === 'topluluk';
        });
      } else {
        matchesTag = item.album.tags.some(
          (tag) => tag.toLowerCase() === selectedTag.toLowerCase(),
        );
      }

      return matchesSearch && matchesTag;
    });
  }, [events, searchQuery, selectedTag]);

  // Zero state when no event albums are published on the Nostr network yet
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-3xl border border-dashed border-zinc-200 bg-white shadow-xs">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-5 shadow-xs">
          <Calendar className="h-7 w-7 stroke-[1.75]" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
          {t.events.noEventsTitle}
        </h2>
        <p className="text-sm text-zinc-500 max-w-md mt-2 mb-6 leading-relaxed">
          {t.events.noEventsDesc}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="default"
            size="default"
            asChild
            className="gap-2 shadow-xs"
          >
            <a href="/events/create">
              <span>{t.events.createEventCta}</span>
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>

          <Button
            variant="outline"
            size="default"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2 border-zinc-200"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-amber-600' : ''}`}
            />
            <span>
              {isRefreshing
                ? locale === 'en'
                  ? 'Checking relays...'
                  : 'Röleler taranıyor...'
                : locale === 'en'
                  ? 'Refresh Relays'
                  : 'Yenile'}
            </span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Search, Tag Filters & Create Action */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder={t.events.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-zinc-200 rounded-xl placeholder-zinc-400 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all shadow-xs"
            />
          </div>

          {/* Filter tags */}
          <div className="flex flex-wrap items-center gap-1.5">
            {filterButtons.map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setSelectedTag(btn.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  selectedTag === btn.id
                    ? 'bg-zinc-900 text-white shadow-xs'
                    : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-9 px-2.5 text-xs text-zinc-600 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900 shadow-xs cursor-pointer"
            title={
              locale === 'en'
                ? 'Refresh events from relays'
                : 'Rölelerden güncel etkinlikleri çek'
            }
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-amber-600' : ''}`}
            />
          </Button>

          <Button
            variant="default"
            size="sm"
            asChild
            className="h-9 gap-1.5 text-xs font-semibold shadow-xs"
          >
            <a href="/events/create">
              <Calendar className="h-3.5 w-3.5 text-amber-400" />
              <span>{t.events.createEventCta}</span>
            </a>
          </Button>
        </div>
      </div>

      {/* Curated Events Showcase (When Available) */}
      {(() => {
        const curatedList = events.filter((item) => item.album.isCurated);
        if (
          curatedList.length === 0 ||
          selectedTag !== 'all' ||
          searchQuery.trim().length > 0
        ) {
          return null;
        }

        return (
          <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50/60 via-white to-amber-50/30 p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-zinc-900 tracking-tight">
                    {locale === 'en' ? 'Phoem Curated Events' : 'Phoem Seçkisi'}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {locale === 'en'
                      ? 'Highlighted photo albums curated on the decentralized network.'
                      : 'Merkeziyetsiz ağ üzerinde öne çıkarılan etkinlik fotoğraf albümleri.'}
                  </p>
                </div>
              </div>
              <Badge
                variant="official"
                className="text-xs px-2.5 py-1 w-fit bg-amber-600 text-white"
              >
                {curatedList.length} {locale === 'en' ? 'Curated' : 'Seçki'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {curatedList.slice(0, 3).map((item) => {
                const albumNaddr = encodeAlbumNaddr(item.album);
                const albumHref = getLocalizedPath(
                  `/album/${albumNaddr}`,
                  locale,
                );
                const startDateFormatted = item.album.startDate
                  ? formatEventDateTime(
                      item.album.startDate,
                      locale,
                      item.album.endDate,
                    )
                  : null;

                return (
                  <a
                    key={`curated-${item.album.coordinate}`}
                    href={albumHref}
                    className="group relative flex flex-col overflow-hidden rounded-xl border border-amber-200/90 bg-white p-4 shadow-xs hover:shadow-md hover:border-amber-300 transition-all"
                  >
                    <div className="aspect-16/9 w-full rounded-lg overflow-hidden bg-zinc-100 mb-3 relative">
                      {item.album.coverImage ? (
                        <img
                          src={getThumbnailUrl(item.album.coverImage)}
                          alt={item.album.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-zinc-400">
                          <Camera className="h-8 w-8 stroke-1" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <Badge
                          variant="official"
                          className="text-[10px] gap-1 px-1.5 py-0 bg-amber-600 text-white"
                        >
                          <Sparkles className="h-2.5 w-2.5" />
                          <span>{locale === 'en' ? 'Curated' : 'Seçki'}</span>
                        </Badge>
                      </div>
                    </div>
                    <h4 className="font-bold text-sm text-zinc-900 group-hover:text-amber-600 transition-colors line-clamp-1">
                      {item.album.title}
                    </h4>
                    {startDateFormatted && (
                      <p className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-zinc-400" />
                        <span>{startDateFormatted}</span>
                      </p>
                    )}
                  </a>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Events Grid */}
      {filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((item) => {
            const startDateFormatted = item.album.startDate
              ? formatEventDateTime(
                  item.album.startDate,
                  locale,
                  item.album.endDate,
                )
              : null;
            const albumNaddr = encodeAlbumNaddr(item.album);
            const albumHref = getLocalizedPath(`/album/${albumNaddr}`, locale);
            const orgHref = item.org
              ? getLocalizedPath(`/org/${item.org.pubkey}`, locale)
              : '#';

            return (
              <div
                key={item.album.coordinate}
                className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-xs transition-all duration-300 hover:shadow-md hover:border-zinc-300"
              >
                {/* Event Cover Image */}
                <a
                  href={albumHref}
                  className="relative aspect-16/10 w-full overflow-hidden bg-zinc-100 block"
                >
                  {item.album.coverImage ? (
                    <img
                      src={getThumbnailUrl(item.album.coverImage)}
                      alt={item.album.title}
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-400">
                      <Camera className="h-10 w-10 stroke-1" />
                    </div>
                  )}

                  {/* Photo Count Badge */}
                  <div className="absolute bottom-3 right-3">
                    <Badge
                      variant="secondary"
                      className="bg-zinc-900/80 text-white backdrop-blur-xs text-[11px] font-mono border-0 shadow-sm gap-1.5"
                    >
                      <Camera className="h-3 w-3 text-amber-400" />
                      <span>
                        {item.photoCount} {t.events.photosCount}
                      </span>
                    </Badge>
                  </div>
                </a>

                {/* Event Content Details */}
                <div className="flex flex-1 flex-col p-5 space-y-4">
                  <div className="space-y-2 flex-1">
                    {/* Organization attribution & curation badges */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      {item.org ? (
                        <a
                          href={orgHref}
                          className="inline-flex items-center gap-2 group/org hover:opacity-80 transition-opacity"
                        >
                          {item.org.picture ? (
                            <img
                              src={item.org.picture}
                              alt={item.org.displayName || item.org.name}
                              className="h-5 w-5 rounded-full object-cover border border-zinc-200"
                            />
                          ) : (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
                              <Building2 className="h-3 w-3" />
                            </div>
                          )}
                          <span className="text-xs font-semibold text-zinc-700 group-hover/org:text-amber-600 transition-colors">
                            {item.org.displayName || item.org.name}
                          </span>
                          {item.org.nip05 && (
                            <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
                          )}
                        </a>
                      ) : (
                        <div />
                      )}

                      <div className="flex items-center gap-1.5">
                        {item.album.isCurated && (
                          <Badge
                            variant="official"
                            className="text-[10px] gap-1 px-1.5 py-0 bg-amber-600 text-white"
                          >
                            <Sparkles className="h-2.5 w-2.5" />
                            <span>{locale === 'en' ? 'Curated' : 'Seçki'}</span>
                          </Badge>
                        )}
                        {item.album.kind === 31923 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-zinc-500 border-zinc-200 px-1 py-0 font-mono"
                          >
                            31923
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Event Title */}
                    <h3 className="text-lg font-bold text-zinc-900 tracking-tight line-clamp-1 group-hover:text-amber-600 transition-colors">
                      <a href={albumHref}>{item.album.title}</a>
                    </h3>

                    {/* Summary */}
                    <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                      {item.album.summary}
                    </p>
                  </div>

                  {/* Meta info & Action */}
                  <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
                    <div className="flex flex-col gap-1 min-w-0">
                      {startDateFormatted && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                          <span className="truncate">{startDateFormatted}</span>
                        </div>
                      )}
                      {item.album.location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                          <span className="truncate">
                            {item.album.location}
                          </span>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="h-8 gap-1.5 text-xs text-zinc-800 hover:bg-zinc-900 hover:text-white border-zinc-200 shrink-0"
                    >
                      <a href={albumHref}>
                        <span>{t.events.viewAlbum}</span>
                        <ArrowRight className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-zinc-200 bg-white">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 mb-4">
            <Search className="h-6 w-6" />
          </div>
          <h4 className="text-base font-bold text-zinc-900">
            {t.events.emptyResults}
          </h4>
          <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-4">
            {t.events.emptyResultsDesc}
          </p>
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setSelectedTag('all');
            }}
          >
            {t.events.filterAll}
          </Button>
        </div>
      )}
    </div>
  );
}

export function EventsGrid({ initialEvents, initialLocale }: EventsGridProps) {
  return (
    <I18nProvider initialLocale={initialLocale}>
      <EventsGridContent initialEvents={initialEvents} />
    </I18nProvider>
  );
}

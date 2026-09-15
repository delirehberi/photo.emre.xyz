/**
 * Interactive Organization Profile & Hosted Events View Component
 * photo.emre.xyz
 *
 * Provides SSR rendering with instant client-side Nostr relay revalidation
 * and dynamic live refresh capabilities.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { OrganizationProfile, EventAlbum } from '@/lib/nostr/types';
import {
  fetchOrgWithEvents,
  formatEventDateTime,
} from '@/lib/nostr/events-data';
import { pubkeyToNpub } from '@/lib/nostr/keys';
import { encodeAlbumNaddr } from '@/lib/nostr/identifiers';
import { getThumbnailUrl } from '@/lib/media';
import { I18nProvider, useI18n, getLocalizedPath } from '@/lib/i18n/context';
import type { Locale } from '@/lib/i18n/dictionary';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OrgZapButton } from '@/components/lightning';
import {
  Building2,
  ShieldCheck,
  Globe,
  Zap,
  Calendar,
  MapPin,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { EventCoverPlaceholder } from '@/components/events/EventCoverPlaceholder';

interface OrgProfileViewProps {
  initialOrg: OrganizationProfile;
  initialEvents: EventAlbum[];
  pubkey: string;
  initialLocale?: Locale;
}

function OrgProfileContent({
  initialOrg,
  initialEvents,
  pubkey,
}: {
  initialOrg: OrganizationProfile;
  initialEvents: EventAlbum[];
  pubkey: string;
}) {
  const { t, locale } = useI18n();
  const [org, setOrg] = useState<OrganizationProfile>(initialOrg);
  const [events, setEvents] = useState<EventAlbum[]>(initialEvents);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasRefreshed, setHasRefreshed] = useState(false);

  // Sync state if props change from SSR
  useEffect(() => {
    setOrg(initialOrg);
    setEvents(initialEvents);
  }, [initialOrg, initialEvents]);

  const npub = useMemo(() => {
    try {
      return pubkeyToNpub(pubkey);
    } catch {
      return pubkey.slice(0, 16) + '...';
    }
  }, [pubkey]);

  const eventsHref = useMemo(
    () => getLocalizedPath('/events', locale),
    [locale],
  );

  const isFallbackOrg = useMemo(() => {
    return (
      !org.picture &&
      !org.banner &&
      !org.nip05 &&
      org.name.startsWith('org-') &&
      org.displayName.startsWith('Organizasyon (')
    );
  }, [org]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const liveData = await fetchOrgWithEvents(pubkey);
      if (liveData.org) {
        setOrg(liveData.org);
      }
      if (liveData.events && liveData.events.length > 0) {
        setEvents(liveData.events);
      }
      setHasRefreshed(true);
    } catch (err) {
      console.warn('Client relay refresh error for organization:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [pubkey]);

  // Client-side fallback: if SSR returned a dummy fallback org or zero events,
  // query the live relay mesh immediately from the client browser
  useEffect(() => {
    if (isFallbackOrg || initialEvents.length === 0) {
      handleRefresh();
    }
  }, [isFallbackOrg, initialEvents.length, handleRefresh]);

  return (
    <div className="space-y-8">
      {/* Navigation & Controls */}
      <div className="flex items-center justify-between">
        <a
          href={eventsHref}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{t.events.backToAllEvents}</span>
        </a>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-8 text-xs gap-1.5 border-zinc-200 text-zinc-700 hover:bg-zinc-100 cursor-pointer"
          title={
            locale === 'en'
              ? 'Query live Nostr relays for latest profile and events'
              : 'En son profil ve etkinlikler için Nostr rölelerini sorgula'
          }
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-amber-600' : 'text-zinc-500'}`}
          />
          <span className="hidden sm:inline">
            {isRefreshing
              ? locale === 'en'
                ? 'Syncing...'
                : 'Senkronize ediliyor...'
              : locale === 'en'
                ? 'Refresh from Relays'
                : 'Rölelerden Yenile'}
          </span>
        </Button>
      </div>

      {/* Organization Hero Profile Card */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
        {/* Banner */}
        <div className="h-44 sm:h-56 w-full bg-gradient-to-r from-amber-500/20 via-orange-400/20 to-amber-600/20 relative overflow-hidden">
          {org.banner && (
            <img
              src={org.banner}
              alt={org.displayName || org.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          )}
        </div>

        {/* Profile Header details */}
        <div className="px-6 sm:px-8 pb-8 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-6">
            <div className="flex items-end gap-4 sm:gap-6">
              <div className="relative shrink-0">
                {org.picture ? (
                  <img
                    src={org.picture}
                    alt={org.displayName || org.name}
                    className="h-24 w-24 sm:h-32 sm:w-32 rounded-2xl border-4 border-white object-cover shadow-md bg-white"
                  />
                ) : (
                  <div className="flex h-24 w-24 sm:h-32 sm:w-32 items-center justify-center rounded-2xl border-4 border-white bg-zinc-100 text-zinc-500 shadow-md">
                    <Building2 className="h-10 w-10 sm:h-12 sm:w-12" />
                  </div>
                )}
              </div>

              <div className="space-y-1 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
                    {org.displayName || org.name}
                  </h1>
                  {org.nip05 && (
                    <Badge variant="official" className="text-xs gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                      <span>{org.nip05}</span>
                    </Badge>
                  )}
                </div>
                <p className="font-mono text-xs text-zinc-400">
                  {npub.slice(0, 16)}...{npub.slice(-8)}
                </p>
              </div>
            </div>

            {/* Send Zap Button Island */}
            <div className="pt-2 sm:pt-0 shrink-0">
              <OrgZapButton org={org} locale={locale} />
            </div>
          </div>

          {/* About Text */}
          {org.about && (
            <p className="text-sm text-zinc-600 max-w-3xl leading-relaxed mt-2 mb-6 whitespace-pre-line">
              {org.about}
            </p>
          )}

          {/* Organization Links & Badges */}
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-zinc-100 text-xs text-zinc-600">
            {org.website && (
              <a
                href={org.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-zinc-700 hover:text-amber-600 font-medium transition-colors"
              >
                <Globe className="h-3.5 w-3.5 text-zinc-400" />
                <span>{org.website.replace(/^https?:\/\//, '')}</span>
              </a>
            )}

            {(org.lud16 || org.lud06) && (
              <span className="inline-flex items-center gap-1.5 text-zinc-700 font-medium">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span>Lightning:</span>
                <code
                  className="font-mono text-[11px] text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded truncate max-w-[200px] sm:max-w-xs"
                  title={org.lud16 || org.lud06}
                >
                  {org.lud16 || org.lud06}
                </code>
              </span>
            )}

            <span className="inline-flex items-center gap-1.5 text-zinc-500">
              <Calendar className="h-3.5 w-3.5 text-zinc-400" />
              <span>
                {events.length}{' '}
                {locale === 'en' ? 'Event Albums' : 'Etkinlik Albümü'}
              </span>
            </span>

            {hasRefreshed && (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{locale === 'en' ? 'Relay Synced' : 'Röle Güncel'}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hosted Event Albums Section */}
      <div className="mt-12 space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
              {t.org.hostedEvents}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              {locale === 'en'
                ? 'All event photo albums published by this organisation on the Nostr network.'
                : 'Bu organizasyon tarafından Nostr üzerinde yayınlanan tüm fotoğraf albümleri.'}
            </p>
          </div>
        </div>

        {events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const albumHref = getLocalizedPath(
                `/album/${encodeAlbumNaddr(event)}`,
                locale,
              );
              const startDate = event.startDate
                ? formatEventDateTime(event.startDate, locale, event.endDate)
                : null;

              return (
                <div
                  key={event.coordinate || event.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs transition hover:shadow-md"
                >
                  <a
                    href={albumHref}
                    className="relative aspect-16/10 w-full overflow-hidden bg-zinc-100 block"
                  >
                    {event.coverImage ? (
                      <img
                        src={getThumbnailUrl(event.coverImage)}
                        alt={event.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <EventCoverPlaceholder
                        seed={event.coordinate || event.id || event.title}
                        title={event.title}
                      />
                    )}
                  </a>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <h3 className="font-bold text-zinc-900 group-hover:text-amber-600 transition-colors">
                        <a href={albumHref}>{event.title}</a>
                      </h3>
                      {event.summary && (
                        <p className="text-xs text-zinc-500 line-clamp-2">
                          {event.summary}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
                      <div className="flex flex-col gap-0.5">
                        {startDate && <span>{startDate}</span>}
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{event.location}</span>
                          </span>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="h-7 text-xs gap-1 border-zinc-200 inline-flex items-center"
                      >
                        <a href={albumHref}>
                          <span>{t.events.viewAlbum}</span>
                          <ArrowRight className="h-3 w-3 shrink-0" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-200 bg-white text-zinc-500 text-sm space-y-3">
            <p>{t.org.noEventsYet}</p>
            {isRefreshing && (
              <p className="text-xs text-amber-600 flex items-center justify-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>
                  {locale === 'en'
                    ? 'Scanning Nostr relays...'
                    : 'Nostr röleleri taranıyor...'}
                </span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function OrgProfileView({
  initialOrg,
  initialEvents,
  pubkey,
  initialLocale,
}: OrgProfileViewProps) {
  return (
    <I18nProvider initialLocale={initialLocale}>
      <OrgProfileContent
        initialOrg={initialOrg}
        initialEvents={initialEvents}
        pubkey={pubkey}
      />
    </I18nProvider>
  );
}

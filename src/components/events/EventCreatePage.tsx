/**
 * Public Event Creation Page Component
 * photo.emre.xyz
 *
 * Allows any authenticated Nostr user to create event albums and upload photos.
 * Provides clear onboarding and external links for visitors without a Nostr account.
 */

import { useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/nostr/auth/context';
import { I18nProvider, useI18n, getLocalizedPath } from '@/lib/i18n/context';
import type { Locale } from '@/lib/i18n/dictionary';
import { EventAlbumCreator } from '@/components/admin/EventAlbumCreator';
import { AuthModal } from '@/components/auth/AuthModal';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  KeyRound,
  Sparkles,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

function EventCreateContent() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div>
        <a
          href={getLocalizedPath('/events', locale)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t.events.backToAllEvents}
        </a>
      </div>

      {user ? (
        <div className="space-y-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-zinc-200 gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
                  {t.nav.createEvent}
                </h1>
                <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                  {locale === 'en'
                    ? 'Publish a new photo album for your community, conference, or hackathon.'
                    : "Topluluğunuz, konferansınız veya hackathon'unuz için yeni bir fotoğraf albümü yayınlayın."}
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-mono max-w-full truncate">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span className="truncate">
                  {user.displayName ||
                    user.nip05 ||
                    `${user.npub.slice(0, 8)}...${user.npub.slice(-4)}`}
                </span>
              </div>
            </div>
          </div>

          <EventAlbumCreator />
        </div>
      ) : (
        <div className="max-w-xl mx-auto rounded-3xl border border-zinc-200 bg-white p-8 sm:p-10 text-center shadow-sm space-y-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-xs">
            <Calendar className="h-7 w-7 stroke-[1.75]" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
              {locale === 'en'
                ? 'Connect to Create an Event Album'
                : 'Etkinlik Albümü Oluşturmak İçin Bağlanın'}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed max-w-md mx-auto">
              {locale === 'en'
                ? 'Event albums on Phoem are signed directly with your Nostr key and broadcast across the decentralized relay mesh.'
                : 'Phoem üzerinde etkinlik albümleri doğrudan sizin Nostr anahtarınızla imzalanır ve merkeziyetsiz röle ağına dağıtılır.'}
            </p>
          </div>

          <Button
            variant="default"
            size="lg"
            className="w-full gap-2 font-semibold shadow-xs"
            onClick={() => setAuthModalOpen(true)}
          >
            <KeyRound className="h-4 w-4 text-amber-400" />
            {t.nav.connect}
          </Button>

          {/* Non-Nostr Guidance */}
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-5 text-left space-y-2.5">
            <div className="flex items-center gap-2 font-semibold text-xs text-zinc-900">
              <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
              <span>
                {locale === 'en'
                  ? "Don't Have a Nostr Account?"
                  : 'Nostr Hesabınız Yok mu?'}
              </span>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              {locale === 'en'
                ? 'A Nostr account is required to publish event albums and upload photos. Explore guides to get a free account in minutes:'
                : 'Etkinlik fotoğrafı yüklemek ve albüm oluşturmak için bir Nostr hesabına ihtiyacınız vardır. Nostr açık iletişim protokolü hakkında bilgi edinmek ve dakikalar içinde ücretsiz bir hesap oluşturmak için rehberleri inceleyin:'}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-semibold">
              <a
                href="https://nostr.org.tr"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-800 underline underline-offset-2"
              >
                <span>nostr.org.tr (Türkçe Rehber)</span>
                <ExternalLink className="h-3 w-3" />
              </a>
              <span className="text-zinc-300">&bull;</span>
              <a
                href="https://nostr.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-800 underline underline-offset-2"
              >
                <span>nostr.com (Küresel Başlangıç)</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <AuthModal
            open={authModalOpen}
            onOpenChange={setAuthModalOpen}
            defaultTab="extension"
          />
        </div>
      )}
    </div>
  );
}

export function EventCreatePage({
  initialLocale,
}: {
  initialLocale?: Locale;
} = {}) {
  return (
    <AuthProvider>
      <I18nProvider initialLocale={initialLocale}>
        <EventCreateContent />
      </I18nProvider>
    </AuthProvider>
  );
}

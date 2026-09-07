/**
 * Organization Creator Component
 * photo.emre.xyz
 *
 * Supports generating new in-browser keypairs or associating existing identities,
 * crafting NIP-01 Kind 0 metadata profiles, and broadcasting across the relay mesh.
 */

import { useState, type SyntheticEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  KeyRound,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { finalizeEvent } from 'nostr-tools/pure';
import { generateNostrKeypair, type NostrKeypair } from '@/lib/nostr/keys';
import { createProfileEventTemplate } from '@/lib/nostr/schemas/profile';
import { OrganizationFormSchema } from '@/lib/nostr/schemas/forms';
import { getSharedRelayPool } from '@/lib/nostr/pool';
import { DEFAULT_RELAYS } from '@/lib/nostr/config';
import type { NostrEvent } from '@/lib/nostr/types';
import { KeypairRevealModal } from '@/components/auth/KeypairRevealModal';

interface RelayBroadcastResult {
  relay: string;
  success: boolean;
}

export function OrganizationCreator() {
  // Generated independent keypair for the organization
  const [generatedKeypair, setGeneratedKeypair] = useState<NostrKeypair | null>(
    null,
  );
  const [showKeyModal, setShowKeyModal] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [about, setAbout] = useState('');
  const [picture, setPicture] = useState('');
  const [banner, setBanner] = useState('');
  const [nip05, setNip05] = useState('');
  const [lud16, setLud16] = useState('');
  const [website, setWebsite] = useState('');

  // Submission & Broadcast State
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResults, setBroadcastResults] = useState<
    RelayBroadcastResult[] | null
  >(null);
  const [publishedEvent, setPublishedEvent] = useState<NostrEvent | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStartGenerateKey = () => {
    const keypair = generateNostrKeypair();
    setGeneratedKeypair(keypair);
    setShowKeyModal(true);
  };

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setBroadcastResults(null);
    setPublishedEvent(null);

    const validationResult = OrganizationFormSchema.safeParse({
      name,
      displayName,
      about,
      picture,
      banner,
      website,
      nip05,
      lud16,
    });

    if (!validationResult.success) {
      const firstError =
        validationResult.error.issues[0]?.message ||
        'Lütfen form alanlarını kontrol ediniz.';
      setErrorMessage(firstError);
      return;
    }

    if (!generatedKeypair) {
      setErrorMessage(
        'Lütfen önce yeni organizasyon için bir anahtar çifti oluşturun ve kaydedin.',
      );
      return;
    }

    setBroadcasting(true);

    try {
      // Construct unsigned Kind 0 template
      const template = createProfileEventTemplate({
        name: name.trim(),
        displayName: displayName.trim() || name.trim(),
        about: about.trim(),
        picture: picture.trim(),
        banner: banner.trim() || undefined,
        nip05: nip05.trim() || undefined,
        lud16: lud16.trim() || undefined,
        website: website.trim() || undefined,
      });

      // 3. Sign Event with Organization's dedicated keypair
      const signedEvent: NostrEvent = finalizeEvent(
        template,
        generatedKeypair.secretKey,
      );

      // 4. Broadcast to Relay Mesh
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Yayınlama başarısız oldu: ${msg}`);
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm">
      <div className="flex items-center gap-3 border-b border-zinc-100 pb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-zinc-900">
            Organizasyon Profili Oluştur
          </h2>
          <p className="text-xs text-zinc-500">
            Nostr ağına NIP-01 Kind 0 meta veri profili oluşturur ve yayınlar.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {publishedEvent && broadcastResults && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Organizasyon Profili Başarıyla Yayınlandı!</span>
          </div>

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
            <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
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

      <form onSubmit={handleSubmit} className="mt-6 space-y-5 text-xs">
        {/* Step 1: Organization Keypair */}
        <div className="space-y-2">
          <label className="font-semibold text-zinc-800 block">
            1. Organizasyon Anahtar Çifti (Nostr Kimliği)
          </label>
          <p className="text-[11px] text-zinc-500">
            Her organizasyon için tarayıcıda bağımsız bir Nostr anahtar çifti
            (npub/nsec) üretilir. Organizasyon profili bu anahtar ile imzalanır.
          </p>

          <div className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 flex items-center justify-between gap-3">
            {generatedKeypair ? (
              <div>
                <span className="text-zinc-500 block text-[11px]">
                  Organizasyon npub:
                </span>
                <span className="font-mono text-zinc-800 font-medium">
                  {generatedKeypair.npub.slice(0, 16)}...
                  {generatedKeypair.npub.slice(-6)}
                </span>
              </div>
            ) : (
              <span className="text-zinc-500 text-xs">
                Organizasyon için henüz anahtar üretilmedi.
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs shrink-0 border-zinc-200 bg-white shadow-2xs"
              onClick={handleStartGenerateKey}
            >
              <KeyRound className="h-3.5 w-3.5 text-amber-600" />
              {generatedKeypair
                ? 'Anahtarları İncele / Yeniden Üret'
                : 'Yeni Anahtar Çifti Üret'}
            </Button>
          </div>
        </div>

        {/* Step 2: Metadata Fields */}
        <div className="space-y-3 pt-2">
          <label className="font-semibold text-zinc-800 block">
            2. Profil Bilgileri (Kind 0)
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="org-name" className="text-zinc-700 font-medium">
                Organizasyon Kimliği / Rumuz *
              </label>
              <input
                id="org-name"
                type="text"
                required
                placeholder="workouse"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="org-display-name"
                className="text-zinc-700 font-medium"
              >
                Görünen Ad
              </label>
              <input
                id="org-display-name"
                type="text"
                placeholder="Workouse Media"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="org-about" className="text-zinc-700 font-medium">
              Açıklama / Hakkında
            </label>
            <textarea
              id="org-about"
              rows={2}
              placeholder="Açık kaynaklı etkinlik fotoğrafçılığı ve medya organizasyonu."
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="org-picture"
                className="text-zinc-700 font-medium"
              >
                Avatar / Logo URL
              </label>
              <input
                id="org-picture"
                type="url"
                placeholder="https://media.emre.xyz/avatar.jpg"
                value={picture}
                onChange={(e) => setPicture(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="org-banner" className="text-zinc-700 font-medium">
                Banner Görseli URL
              </label>
              <input
                id="org-banner"
                type="url"
                placeholder="https://media.emre.xyz/banner.jpg"
                value={banner}
                onChange={(e) => setBanner(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label htmlFor="org-nip05" className="text-zinc-700 font-medium">
                NIP-05 Kimliği
              </label>
              <input
                id="org-nip05"
                type="text"
                placeholder="media@emre.xyz"
                value={nip05}
                onChange={(e) => setNip05(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="org-lud16" className="text-zinc-700 font-medium">
                Lightning Adresi (LUD-16)
              </label>
              <input
                id="org-lud16"
                type="text"
                placeholder="delirehberi@getalby.com"
                value={lud16}
                onChange={(e) => setLud16(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="org-website"
                className="text-zinc-700 font-medium"
              >
                Web Sitesi
              </label>
              <input
                id="org-website"
                type="url"
                placeholder="https://workouse.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
          </div>
        </div>

        <Button
          type="submit"
          variant="default"
          size="default"
          className="w-full gap-2 mt-4 font-semibold"
          disabled={broadcasting}
        >
          {broadcasting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Building2 className="h-4 w-4 text-amber-400" />
          )}
          {broadcasting
            ? 'Röle Ağına Yayınlanıyor...'
            : 'Profili İmzala ve Yayınla (Beta: Ücretsiz)'}
        </Button>
      </form>

      <KeypairRevealModal
        open={showKeyModal}
        onOpenChange={setShowKeyModal}
        keypair={generatedKeypair}
        onConfirm={(kp) => {
          setGeneratedKeypair(kp);
          setShowKeyModal(false);
        }}
      />
    </div>
  );
}

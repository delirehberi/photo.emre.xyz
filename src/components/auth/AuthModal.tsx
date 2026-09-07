/**
 * Nostr Authentication Modal Component
 * photo.emre.xyz
 *
 * Supports NIP-07 extension login, NIP-46 Bunker (URI + QR pairing),
 * direct private key (nsec), and read-only (npub) observer mode.
 */

import { useState, useEffect, useCallback, type SyntheticEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  KeyRound,
  Puzzle,
  QrCode,
  Eye,
  ArrowRight,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/lib/nostr/auth/context';
import { useI18n } from '@/lib/i18n/context';
import { Nip07Signer, Nip46Signer } from '@/lib/nostr/signer';
import { generateNostrKeypair, type NostrKeypair } from '@/lib/nostr/keys';
import { generateQrSvg } from '@/lib/media/qr';
import { KeypairRevealModal } from './KeypairRevealModal';

export interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'extension' | 'bunker' | 'key' | 'readonly';
  onSuccess?: () => void;
}

export function AuthModal({
  open,
  onOpenChange,
  defaultTab = 'extension',
  onSuccess,
}: AuthModalProps) {
  const {
    loginWithNip07,
    loginWithBunker,
    loginWithPrivateKey,
    loginReadOnly,
  } = useAuth();
  const { t, locale } = useI18n();

  const [tab, setTab] = useState<string>(defaultTab);
  const [hasExtension, setHasExtension] = useState(false);
  const [bunkerInput, setBunkerInput] = useState('');
  const [nsecInput, setNsecInput] = useState('');
  const [npubInput, setNpubInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // QR Pairing state for NIP-46 Nostr Connect
  const [bunkerMode, setBunkerMode] = useState<'input' | 'qr'>('input');
  const [pairingUri, setPairingUri] = useState<string | null>(null);
  const [pairingQrSvg, setPairingQrSvg] = useState<string | null>(null);
  const [copiedPairingUri, setCopiedPairingUri] = useState(false);

  // Key generator modal state
  const [generatedKeypair, setGeneratedKeypair] = useState<NostrKeypair | null>(
    null,
  );
  const [showKeypairModal, setShowKeypairModal] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHasExtension(Nip07Signer.isAvailable());
    }
  }, [open]);

  // Generate QR code pairing session when user opens the QR tab
  const setupQrPairing = useCallback(async () => {
    const session = Nip46Signer.createPairingSession();
    setPairingUri(session.uri);
    try {
      const svg = await generateQrSvg(session.uri, {
        width: 200,
        darkColor: '#18181b',
        lightColor: '#ffffff',
      });
      setPairingQrSvg(svg);
    } catch {
      // Fall back without QR
    }
  }, []);

  useEffect(() => {
    if (bunkerMode === 'qr' && !pairingUri) {
      setupQrPairing();
    }
  }, [bunkerMode, pairingUri, setupQrPairing]);

  const handleExtensionLogin = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await loginWithNip07();
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBunkerLogin = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!bunkerInput.trim()) return;

    setLoading(true);
    setErrorMessage(null);
    try {
      await loginWithBunker(bunkerInput.trim());
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePrivateKeyLogin = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!nsecInput.trim()) return;

    setLoading(true);
    setErrorMessage(null);
    try {
      await loginWithPrivateKey(nsecInput.trim());
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReadOnlyLogin = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!npubInput.trim()) return;

    setLoading(true);
    setErrorMessage(null);
    try {
      await loginReadOnly(npubInput.trim());
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKeypair = () => {
    const keypair = generateNostrKeypair();
    setGeneratedKeypair(keypair);
    setShowKeypairModal(true);
  };

  const handleKeypairConfirmed = async (keypair: NostrKeypair) => {
    try {
      await loginWithPrivateKey(keypair.nsec);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    }
  };

  const handleCopyPairingUri = () => {
    if (pairingUri && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(pairingUri);
      setCopiedPairingUri(true);
      setTimeout(() => setCopiedPairingUri(false), 2000);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md border-zinc-200 bg-white p-6 text-zinc-900 shadow-2xl sm:rounded-2xl">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="text-lg font-bold text-zinc-950 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-200/60 shadow-xs">
                <KeyRound className="h-4 w-4" />
              </div>
              <span>{t.auth.modalTitle}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 leading-relaxed">
              {t.auth.modalDesc}
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <Tabs value={tab} onValueChange={setTab} className="mt-1 w-full">
            <TabsList className="grid w-full grid-cols-4 h-9 bg-zinc-100/90 p-1 border border-zinc-200/80">
              <TabsTrigger value="extension" className="text-xs">
                {t.auth.tabExtension.split(' ')[0]}
              </TabsTrigger>
              <TabsTrigger value="bunker" className="text-xs">
                Bunker
              </TabsTrigger>
              <TabsTrigger value="key" className="text-xs">
                nsec
              </TabsTrigger>
              <TabsTrigger value="readonly" className="text-xs">
                npub
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: NIP-07 Extension */}
            <TabsContent value="extension" className="space-y-4 pt-3">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 text-center space-y-3">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-800 shadow-xs">
                  <Puzzle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {t.auth.extensionTitle}
                  </p>
                  <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                    {t.auth.extensionDesc}
                  </p>
                </div>
                {hasExtension ? (
                  <p className="text-[11px] font-medium text-emerald-700 bg-emerald-50 py-1 px-2 rounded-md inline-block border border-emerald-200/60">
                    {locale === 'en'
                      ? 'Extension detected in browser'
                      : 'Tarayıcı eklentisi algılandı'}
                  </p>
                ) : (
                  <p className="text-[11px] text-zinc-500">
                    {t.auth.extensionNotFound}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="default"
                className="w-full gap-2 shadow-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white"
                onClick={handleExtensionLogin}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                {loading
                  ? locale === 'en'
                    ? 'Connecting...'
                    : 'Bağlanıyor...'
                  : t.auth.extensionConnectBtn}
              </Button>
            </TabsContent>

            {/* TAB 2: NIP-46 Bunker */}
            <TabsContent value="bunker" className="space-y-3 pt-3">
              <div className="flex justify-end gap-1 text-xs">
                <Button
                  type="button"
                  variant={bunkerMode === 'input' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={() => setBunkerMode('input')}
                >
                  {t.auth.bunkerModeInput}
                </Button>
                <Button
                  type="button"
                  variant={bunkerMode === 'qr' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 text-[11px] gap-1"
                  onClick={() => setBunkerMode('qr')}
                >
                  <QrCode className="h-3 w-3" />
                  {t.auth.bunkerModeQr}
                </Button>
              </div>

              {bunkerMode === 'input' ? (
                <form onSubmit={handleBunkerLogin} className="space-y-3">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="bunker-uri"
                      className="text-xs font-semibold text-zinc-800"
                    >
                      {t.auth.bunkerTitle}
                    </label>
                    <input
                      id="bunker-uri"
                      type="text"
                      placeholder={t.auth.bunkerPlaceholder}
                      value={bunkerInput}
                      onChange={(e) => setBunkerInput(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2 font-mono text-xs text-zinc-900 placeholder-zinc-400 focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none transition-colors"
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="default"
                    className="w-full gap-2 shadow-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white"
                    disabled={loading || !bunkerInput.trim()}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                    {loading
                      ? t.auth.bunkerConnecting
                      : t.auth.bunkerConnectBtn}
                  </Button>
                </form>
              ) : (
                <div className="space-y-3 text-center">
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 flex flex-col items-center justify-center">
                    {pairingQrSvg ? (
                      <div
                        className="rounded-xl bg-white p-3 border border-zinc-200 shadow-xs"
                        dangerouslySetInnerHTML={{ __html: pairingQrSvg }}
                      />
                    ) : (
                      <div className="flex h-48 w-48 items-center justify-center text-xs text-zinc-500">
                        <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
                      </div>
                    )}
                    <p className="mt-3 text-xs text-zinc-600 font-medium">
                      {t.auth.bunkerScanNotice}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 text-xs border-zinc-200 text-zinc-800 hover:bg-zinc-100"
                    onClick={handleCopyPairingUri}
                    disabled={!pairingUri}
                  >
                    {copiedPairingUri ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copiedPairingUri
                      ? t.auth.copiedPairingUri
                      : t.auth.copyPairingUri}
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* TAB 3: Secret Key / nsec */}
            <TabsContent value="key" className="space-y-3 pt-3">
              <form onSubmit={handlePrivateKeyLogin} className="space-y-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="nsec-input"
                    className="text-xs font-semibold text-zinc-800"
                  >
                    {t.auth.keyTitle}
                  </label>
                  <input
                    id="nsec-input"
                    type="password"
                    placeholder={t.auth.keyPlaceholder}
                    value={nsecInput}
                    onChange={(e) => setNsecInput(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2 font-mono text-xs text-zinc-900 placeholder-zinc-400 focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none transition-colors"
                  />
                  <span className="text-[11px] text-zinc-500 block">
                    {t.auth.keyVolatileNotice}
                  </span>
                </div>
                <Button
                  type="submit"
                  variant="default"
                  className="w-full gap-2 shadow-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white"
                  disabled={loading || !nsecInput.trim()}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  {loading ? t.auth.keyValidating : t.auth.keyConnectBtn}
                </Button>
              </form>

              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-zinc-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-zinc-500 text-[10px] font-medium">
                    {t.auth.orCreateNew}
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 text-xs border-zinc-200 text-zinc-800 hover:bg-zinc-100"
                onClick={handleGenerateKeypair}
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                {t.auth.generateKeypairBtn}
              </Button>
            </TabsContent>

            {/* TAB 4: Read-Only npub */}
            <TabsContent value="readonly" className="space-y-3 pt-3">
              <form onSubmit={handleReadOnlyLogin} className="space-y-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="npub-input"
                    className="text-xs font-semibold text-zinc-800"
                  >
                    {t.auth.readOnlyTitle}
                  </label>
                  <input
                    id="npub-input"
                    type="text"
                    placeholder={t.auth.readOnlyPlaceholder}
                    value={npubInput}
                    onChange={(e) => setNpubInput(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2 font-mono text-xs text-zinc-900 placeholder-zinc-400 focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none transition-colors"
                  />
                  <span className="text-[11px] text-zinc-500 block leading-relaxed">
                    {t.auth.readOnlyNotice}
                  </span>
                </div>
                <Button
                  type="submit"
                  variant="secondary"
                  className="w-full gap-2 border border-zinc-200 font-semibold"
                  disabled={loading || !npubInput.trim()}
                >
                  <Eye className="h-4 w-4" />
                  {t.auth.readOnlyConnectBtn}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Non-Nostr Onboarding Guide */}
          <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3.5 text-xs text-amber-950 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-amber-900">
              <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>
                {locale === 'en'
                  ? "Don't have a Nostr account?"
                  : 'Nostr hesabınız yok mu?'}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800/90">
              {locale === 'en'
                ? 'You need a Nostr account to upload event photos and create albums. Learn about Nostr and create a free account in minutes:'
                : 'Etkinlik fotoğrafı yüklemek ve albüm oluşturmak için bir Nostr hesabına ihtiyacınız vardır. Nostr hakkında bilgi almak ve hemen bir hesap edinmek için:'}
            </p>
            <div className="flex items-center gap-3 pt-1 font-semibold text-[11px]">
              <a
                href="https://nostr.org.tr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-700 hover:text-amber-900 hover:underline flex items-center gap-1"
              >
                nostr.org.tr &rarr;
              </a>
              <span className="text-amber-300">&bull;</span>
              <a
                href="https://nostr.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-700 hover:text-amber-900 hover:underline flex items-center gap-1"
              >
                nostr.com &rarr;
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Embedded Keypair Reveal Modal when generating fresh keys */}
      <KeypairRevealModal
        open={showKeypairModal}
        onOpenChange={setShowKeypairModal}
        keypair={generatedKeypair}
        onConfirm={handleKeypairConfirmed}
      />
    </>
  );
}

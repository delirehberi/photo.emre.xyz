/**
 * Organization Direct Zap Modal Component
 * photo.emre.xyz
 *
 * Allows users to send NIP-57 Bitcoin Lightning zaps directly to an organization's
 * LUD-16 (Lightning Address) or LUD-06 (LNURL) with real-time on-relay receipt verification.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  QrCode,
  Wallet,
  Copy,
  Check,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  Building2,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '@/lib/nostr/auth/context';
import { useI18n } from '@/lib/i18n/context';
import { isWebLNAvailable, payWithWebLN } from '@/lib/lightning/webln';
import {
  getStoredNWC,
  storeNWC,
  clearStoredNWC,
  payWithNWC,
} from '@/lib/lightning/nwc';
import {
  createZapInvoice,
  generateInvoiceQrDataUrl,
} from '@/lib/lightning/lnurl';
import { waitForZapReceipt } from '@/lib/lightning/settlement';
import type { PaymentProof, NWCConnectionConfig } from '@/lib/lightning/types';
import type { OrganizationProfile } from '@/lib/nostr/types';
import { AuthModal } from '@/components/auth/AuthModal';

export interface OrgZapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  org: OrganizationProfile;
}

const PRESET_AMOUNTS = [21, 100, 500, 1000, 5000];

export function OrgZapModal({ open, onOpenChange, org }: OrgZapModalProps) {
  const { user, signer } = useAuth();
  const { t } = useI18n();

  // Selected zap amount and comment
  const [amountSats, setAmountSats] = useState<number>(100);
  const [customAmountStr, setCustomAmountStr] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [memo, setMemo] = useState<string>('');

  // Active payment channel tab
  const [activeTab, setActiveTab] = useState<'webln' | 'nwc' | 'qr'>('webln');

  // Invoice & QR states
  const [invoice, setInvoice] = useState<string | null>(null);
  const [zapRequestId, setZapRequestId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [generatingInvoice, setGeneratingInvoice] = useState<boolean>(false);

  // Settlement & progress state
  const [payingWebln, setPayingWebln] = useState<boolean>(false);
  const [payingNwc, setPayingNwc] = useState<boolean>(false);
  const [settledProof, setSettledProof] = useState<PaymentProof | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedInvoice, setCopiedInvoice] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);

  // NWC Management
  const [nwcConfig, setNwcConfig] = useState<NWCConnectionConfig | null>(null);
  const [nwcInputUri, setNwcInputUri] = useState<string>('');
  const [nwcSaveError, setNwcSaveError] = useState<string | null>(null);

  // WebLN presence check
  const [hasWebLN, setHasWebLN] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const effectiveAddress = org.lud16 || org.lud06 || '';

  // Initialize environment and reset state on open
  useEffect(() => {
    if (open) {
      setHasWebLN(isWebLNAvailable());
      const stored = getStoredNWC();
      setNwcConfig(stored);
      setSettledProof(null);
      setErrorMessage(null);
      setInvoice(null);
      setZapRequestId(null);
      setQrDataUrl(null);
    } else {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    }
  }, [open]);

  // Generate Zap Invoice for current amount and memo
  const generateInvoice = useCallback(async () => {
    if (!open || !effectiveAddress || !signer || signer.type === 'readOnly') {
      return;
    }

    const currentAmount = isCustom
      ? Number.parseInt(customAmountStr, 10)
      : amountSats;

    if (!currentAmount || Number.isNaN(currentAmount) || currentAmount <= 0) {
      setErrorMessage('Lütfen geçerli bir satoshi miktarı giriniz.');
      return;
    }

    setGeneratingInvoice(true);
    setErrorMessage(null);

    // Abort previous on-relay listener if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const result = await createZapInvoice({
        signer,
        amountSats: currentAmount,
        action: 'organization_zap',
        recipientLud16: effectiveAddress,
        recipientPubkey: org.pubkey,
        memo: memo.trim() || `Zap to ${org.displayName || org.name} ⚡`,
      });

      setInvoice(result.bolt11);
      setZapRequestId(result.zapRequest.id);

      const qrUrl = await generateInvoiceQrDataUrl(result.bolt11);
      setQrDataUrl(qrUrl);

      // Start zero-database on-relay listener for Kind 9735 Zap Receipt
      waitForZapReceipt({
        zapRequestId: result.zapRequest.id,
        bolt11: result.bolt11,
        expectedAmountSats: currentAmount,
        payerPubkey: user?.pubkey || '',
        signal: abortController.signal,
      })
        .then((proof) => {
          setSettledProof(proof);
        })
        .catch((err) => {
          if (!abortController.signal.aborted) {
            console.warn('On-relay zap listener status:', err);
          }
        });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Zap faturası oluşturulamadı: ${msg}`);
    } finally {
      setGeneratingInvoice(false);
    }
  }, [
    open,
    effectiveAddress,
    signer,
    isCustom,
    customAmountStr,
    amountSats,
    org.pubkey,
    org.displayName,
    org.name,
    memo,
    user?.pubkey,
  ]);

  // Automatically request invoice when authenticated and amount is determined
  useEffect(() => {
    if (
      open &&
      effectiveAddress &&
      user &&
      signer &&
      signer.type !== 'readOnly'
    ) {
      const currentAmount = isCustom
        ? Number.parseInt(customAmountStr, 10)
        : amountSats;
      if (currentAmount && currentAmount > 0) {
        generateInvoice();
      }
    }
  }, [
    open,
    effectiveAddress,
    user,
    signer,
    amountSats,
    isCustom,
    generateInvoice,
    customAmountStr,
  ]);

  // WebLN Payment Handler
  const handlePayWebLN = async () => {
    if (!invoice) return;
    setPayingWebln(true);
    setErrorMessage(null);

    try {
      const res = await payWithWebLN(invoice);
      const currentAmount = isCustom
        ? Number.parseInt(customAmountStr, 10) || amountSats
        : amountSats;

      const proof: PaymentProof = {
        method: 'webln',
        preimage: res.preimage,
        bolt11: invoice,
        amountSats: currentAmount,
        settledAt: Math.floor(Date.now() / 1000),
        payerPubkey: user?.pubkey || '',
      };
      setSettledProof(proof);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setPayingWebln(false);
    }
  };

  // NWC Payment Handler
  const handlePayNWC = async () => {
    if (!invoice || !nwcConfig) return;
    setPayingNwc(true);
    setErrorMessage(null);

    try {
      const res = await payWithNWC(nwcConfig, invoice);
      const currentAmount = isCustom
        ? Number.parseInt(customAmountStr, 10) || amountSats
        : amountSats;

      const proof: PaymentProof = {
        method: 'nwc',
        preimage: res.preimage,
        bolt11: invoice,
        amountSats: currentAmount,
        settledAt: Math.floor(Date.now() / 1000),
        payerPubkey: user?.pubkey || '',
      };
      setSettledProof(proof);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setPayingNwc(false);
    }
  };

  // NWC URI Save
  const handleSaveNWC = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setNwcSaveError(null);
    try {
      const config = storeNWC(nwcInputUri);
      setNwcConfig(config);
      setNwcInputUri('');
    } catch (err: unknown) {
      setNwcSaveError(err instanceof Error ? err.message : String(err));
    }
  };

  // NWC Disconnect
  const handleDisconnectNWC = () => {
    clearStoredNWC();
    setNwcConfig(null);
  };

  // Copy Invoice string
  const handleCopyInvoice = () => {
    if (invoice && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(invoice);
      setCopiedInvoice(true);
      setTimeout(() => setCopiedInvoice(false), 2000);
    }
  };

  const currentEffectiveAmount = isCustom
    ? Number.parseInt(customAmountStr, 10) || 0
    : amountSats;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md border-zinc-200 bg-white text-zinc-900 p-6 sm:rounded-2xl shadow-2xl">
          <DialogHeader className="space-y-1 pb-3 border-b border-zinc-100 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-200/80 shadow-xs">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-zinc-950">
                    {t.org.zapModalTitle}
                  </DialogTitle>
                </div>
              </div>
              <Badge
                variant="default"
                className="font-mono text-xs bg-amber-50 text-amber-800 border-amber-200 shadow-xs"
              >
                {currentEffectiveAmount} sats
              </Badge>
            </div>
            <DialogDescription className="text-xs text-zinc-500 pt-1 leading-relaxed">
              {t.org.zapModalDesc}
            </DialogDescription>
          </DialogHeader>

          {/* Recipient Card */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-200/80">
            {org.picture ? (
              <img
                src={org.picture}
                alt={org.displayName}
                className="h-9 w-9 rounded-full object-cover border border-zinc-200"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 border border-zinc-200">
                <Building2 className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-zinc-900 truncate">
                  {org.displayName || org.name}
                </span>
                {org.nip05 && (
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                )}
              </div>
              <span className="text-[11px] font-mono text-zinc-500 truncate block">
                {effectiveAddress}
              </span>
            </div>
          </div>

          {/* Unauthenticated State */}
          {!user && (
            <div className="py-6 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 border border-amber-200 text-amber-600 shadow-xs">
                <KeyRound className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-zinc-900">
                  Nostr Hesabı Gerekli
                </h3>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
                  NIP-57 standardında imzalı bir zap gönderebilmek için lütfen
                  Nostr hesabınızla bağlanın.
                </p>
              </div>
              <Button
                variant="default"
                size="sm"
                className="text-xs gap-2 shadow-xs bg-zinc-900 text-white hover:bg-zinc-800"
                onClick={() => setAuthModalOpen(true)}
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span>Nostr ile Bağlan</span>
              </Button>
            </div>
          )}

          {/* Settled State */}
          {user && settledProof && (
            <div className="py-4 space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-xs">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-emerald-800">
                  {t.org.zapSuccessTitle}
                </h3>
                <p className="text-xs text-zinc-600">
                  <strong>{settledProof.amountSats}</strong>{' '}
                  {t.org.zapSuccessDesc}
                </p>
              </div>

              {settledProof.preimage && (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 text-left space-y-1">
                  <span className="text-[10px] text-zinc-500 block uppercase font-mono tracking-wider font-semibold">
                    {t.lightning.preimageLabel}
                  </span>
                  <span className="font-mono text-[11px] text-zinc-800 break-all block">
                    {settledProof.preimage}
                  </span>
                </div>
              )}

              <Button
                variant="default"
                size="sm"
                className="w-full text-xs font-semibold shadow-xs bg-zinc-900 hover:bg-zinc-800 text-white"
                onClick={() => onOpenChange(false)}
              >
                {t.lightning.continueBtn}
              </Button>
            </div>
          )}

          {/* Standard Zap Payment Flow */}
          {user && !settledProof && (
            <div className="space-y-4 pt-1 text-xs">
              {errorMessage && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <div className="flex-1">
                    <span>{errorMessage}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-[11px] text-rose-700 hover:text-rose-900 hover:bg-rose-100"
                    onClick={generateInvoice}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    {t.common.retry}
                  </Button>
                </div>
              )}

              {/* Amount Selector */}
              <div className="space-y-2">
                <label className="font-semibold text-zinc-800 block">
                  {t.org.zapAmountLabel}
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {PRESET_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setIsCustom(false);
                        setAmountSats(amt);
                      }}
                      className={`py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                        !isCustom && amountSats === amt
                          ? 'bg-amber-500 text-white font-bold shadow-xs'
                          : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                      }`}
                    >
                      {amt}
                    </button>
                  ))}
                </div>

                <div className="pt-1">
                  <input
                    type="number"
                    min={1}
                    placeholder={t.org.zapCustomPlaceholder}
                    value={customAmountStr}
                    onChange={(e) => {
                      setIsCustom(true);
                      setCustomAmountStr(e.target.value);
                    }}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Optional Memo */}
              <div className="space-y-1">
                <label className="font-semibold text-zinc-800 block">
                  {t.org.zapMemoLabel}
                </label>
                <input
                  type="text"
                  placeholder={t.org.zapMemoPlaceholder}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>

              {/* Payment Methods */}
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as 'webln' | 'nwc' | 'qr')}
                className="w-full pt-1"
              >
                <TabsList className="grid grid-cols-3 w-full bg-zinc-100/90 p-1 border border-zinc-200/80">
                  <TabsTrigger value="webln" className="text-xs gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    {t.lightning.tabWebln}
                  </TabsTrigger>
                  <TabsTrigger value="nwc" className="text-xs gap-1.5">
                    <Wallet className="h-3.5 w-3.5 text-indigo-500" />
                    {t.lightning.tabNwc}
                  </TabsTrigger>
                  <TabsTrigger value="qr" className="text-xs gap-1.5">
                    <QrCode className="h-3.5 w-3.5 text-emerald-600" />
                    {t.lightning.tabQr}
                  </TabsTrigger>
                </TabsList>

                {/* Tab 1: WebLN */}
                <TabsContent value="webln" className="space-y-3 pt-2">
                  {hasWebLN ? (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-3 text-center">
                      <div className="flex items-center justify-center gap-2 text-xs font-semibold text-zinc-900">
                        <Zap className="h-4 w-4 text-amber-500" />
                        <span>{t.lightning.weblnDetected}</span>
                      </div>
                      <p className="text-xs text-zinc-600 leading-relaxed">
                        Tarayıcınızdaki WebLN cüzdanınız ile tek tıkla onaylayıp
                        zap gönderin.
                      </p>
                      <Button
                        variant="default"
                        size="default"
                        className="w-full gap-2 text-xs font-semibold shadow-xs bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer"
                        onClick={handlePayWebLN}
                        disabled={payingWebln || generatingInvoice || !invoice}
                      >
                        {payingWebln ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Zap className="h-4 w-4 text-amber-400" />
                        )}
                        {payingWebln
                          ? t.lightning.weblnConfirming
                          : `${currentEffectiveAmount} Sat Zap Gönder`}
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-3 text-center">
                      <p className="text-xs text-zinc-600 leading-relaxed">
                        {t.lightning.weblnNotFound}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs border-zinc-200 text-zinc-800 hover:bg-zinc-100 cursor-pointer"
                        onClick={() => setActiveTab('qr')}
                      >
                        <QrCode className="h-3.5 w-3.5 mr-1.5" />
                        {t.lightning.payQrInstead}
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* Tab 2: NWC (NIP-47) */}
                <TabsContent value="nwc" className="space-y-3 pt-2">
                  {nwcConfig ? (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900">
                          <Wallet className="h-4 w-4 text-indigo-500" />
                          <span>{t.lightning.nwcConnected}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 text-[11px] text-zinc-500 hover:text-rose-600 cursor-pointer"
                          onClick={handleDisconnectNWC}
                        >
                          {t.lightning.nwcDisconnect}
                        </Button>
                      </div>

                      <div className="rounded-xl border border-zinc-200 bg-white p-2.5 text-[11px] font-mono text-zinc-700 truncate">
                        Wallet: {nwcConfig.walletPubkey.slice(0, 16)}...
                      </div>

                      <Button
                        variant="default"
                        size="default"
                        className="w-full gap-2 text-xs font-semibold shadow-xs bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer"
                        onClick={handlePayNWC}
                        disabled={payingNwc || generatingInvoice || !invoice}
                      >
                        {payingNwc ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Wallet className="h-4 w-4 text-indigo-400" />
                        )}
                        {payingNwc
                          ? t.lightning.nwcExecuting
                          : `${currentEffectiveAmount} Sat Zap Gönder (NWC)`}
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleSaveNWC} className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-800">
                          {t.lightning.nwcLabel}
                        </label>
                        <input
                          type="password"
                          required
                          placeholder={t.lightning.nwcPlaceholder}
                          value={nwcInputUri}
                          onChange={(e) => setNwcInputUri(e.target.value)}
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none font-mono transition-colors"
                        />
                      </div>

                      {nwcSaveError && (
                        <p className="text-[11px] text-rose-600 font-medium">
                          {nwcSaveError}
                        </p>
                      )}

                      <Button
                        type="submit"
                        variant="default"
                        size="sm"
                        className="w-full text-xs font-semibold shadow-xs bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer"
                      >
                        {t.lightning.nwcSaveBtn}
                      </Button>
                    </form>
                  )}
                </TabsContent>

                {/* Tab 3: Dynamic QR Code & Invoice */}
                <TabsContent value="qr" className="space-y-3 pt-2">
                  {generatingInvoice ? (
                    <div className="py-10 text-center space-y-2">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-amber-500" />
                      <p className="text-xs text-zinc-500">
                        {t.lightning.generatingInvoice}
                      </p>
                    </div>
                  ) : qrDataUrl && invoice ? (
                    <div className="space-y-3 text-center">
                      <div className="mx-auto w-[200px] rounded-2xl border border-zinc-200 bg-white p-3 shadow-xs">
                        <img
                          src={qrDataUrl}
                          alt="Lightning Invoice QR Code"
                          className="w-full h-auto rounded-lg"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          readOnly
                          value={invoice}
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 px-3 py-1.5 text-[11px] font-mono text-zinc-800 truncate focus:outline-none"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs shrink-0 border-zinc-200 text-zinc-800 hover:bg-zinc-100 cursor-pointer"
                          onClick={handleCopyInvoice}
                        >
                          {copiedInvoice ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <a
                          href={`lightning:${invoice}`}
                          className="inline-flex items-center gap-1 text-amber-600 font-semibold hover:underline text-[11px]"
                        >
                          {t.lightning.openInWallet}
                          <ExternalLink className="h-3 w-3" />
                        </a>

                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                          </span>
                          <span>{t.lightning.awaitingRelay}</span>
                        </div>
                      </div>

                      {zapRequestId && (
                        <div className="text-[10px] font-mono text-zinc-400 truncate pt-1 text-left border-t border-zinc-100">
                          Zap: {zapRequestId.slice(0, 16)}...
                        </div>
                      )}
                    </div>
                  ) : null}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        defaultTab="extension"
      />
    </>
  );
}

/**
 * Multi-Provider Lightning Payment Modal Component
 * photo.emre.xyz
 *
 * Provides WebLN, NIP-47 (NWC), and dynamic LNURL / BOLT-11 QR code settlement
 * with zero-sat admin exemption bypass.
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
} from 'lucide-react';
import { useAuth } from '@/lib/nostr/auth/context';
import { useI18n } from '@/lib/i18n/context';
import { calculateActionFee } from '@/lib/lightning/rates';
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
import type {
  MonetizedAction,
  PaymentProof,
  NWCConnectionConfig,
} from '@/lib/lightning/types';

export interface LightningPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: MonetizedAction;
  count?: number;
  onSettled: (proof: PaymentProof) => void;
}

export function LightningPaymentModal({
  open,
  onOpenChange,
  action,
  count = 1,
  onSettled,
}: LightningPaymentModalProps) {
  const { user, signer } = useAuth();
  const { t } = useI18n();

  // Fee calculation
  const quote = calculateActionFee(action, {
    count,
    userPubkey: user?.pubkey,
  });

  // Active Tab
  const [activeTab, setActiveTab] = useState<'webln' | 'nwc' | 'qr'>('webln');

  // Invoice & QR state
  const [invoice, setInvoice] = useState<string | null>(null);
  const [zapRequestId, setZapRequestId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  // Payment Execution & Status
  const [payingWebln, setPayingWebln] = useState(false);
  const [payingNwc, setPayingNwc] = useState(false);
  const [settledProof, setSettledProof] = useState<PaymentProof | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedInvoice, setCopiedInvoice] = useState(false);

  // NWC Management
  const [nwcConfig, setNwcConfig] = useState<NWCConnectionConfig | null>(null);
  const [nwcInputUri, setNwcInputUri] = useState('');
  const [nwcSaveError, setNwcSaveError] = useState<string | null>(null);

  // WebLN presence check
  const [hasWebLN, setHasWebLN] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Load environment & storage state on open
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

  // Handle Admin Bypass
  const handleAdminBypass = () => {
    if (!user) return;
    const proof: PaymentProof = {
      method: 'admin_bypass',
      amountSats: 0,
      settledAt: Math.floor(Date.now() / 1000),
      payerPubkey: user.pubkey,
    };
    setSettledProof(proof);
    onSettled(proof);
    onOpenChange(false);
  };

  // Generate Zap Invoice and start on-relay listener
  const generateInvoice = useCallback(async () => {
    if (!open || quote.isExempt || !signer || signer.type === 'readOnly') {
      return;
    }

    setGeneratingInvoice(true);
    setErrorMessage(null);

    // Abort previous listener if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const result = await createZapInvoice({
        signer,
        amountSats: quote.totalSats,
        action,
        memo: `photo.emre.xyz payment: ${quote.description}`,
      });

      setInvoice(result.bolt11);
      setZapRequestId(result.zapRequest.id);

      // Generate QR Code image
      const qrUrl = await generateInvoiceQrDataUrl(result.bolt11);
      setQrDataUrl(qrUrl);

      // Start zero-database on-relay listener for Kind 9735
      waitForZapReceipt({
        zapRequestId: result.zapRequest.id,
        bolt11: result.bolt11,
        expectedAmountSats: quote.totalSats,
        payerPubkey: user?.pubkey || '',
        signal: abortController.signal,
      })
        .then((proof) => {
          setSettledProof(proof);
          onSettled(proof);
        })
        .catch((err) => {
          if (!abortController.signal.aborted) {
            console.warn('On-relay payment listener status:', err);
          }
        });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Invoice generation failed: ${msg}`);
    } finally {
      setGeneratingInvoice(false);
    }
  }, [open, quote, signer, action, user, onSettled]);

  // Fetch invoice on open when not exempt
  useEffect(() => {
    if (
      open &&
      !quote.isExempt &&
      user &&
      signer &&
      signer.type !== 'readOnly'
    ) {
      generateInvoice();
    }
  }, [open, quote.isExempt, user, signer, generateInvoice]);

  // WebLN Payment Handler
  const handlePayWebLN = async () => {
    if (!invoice) return;
    setPayingWebln(true);
    setErrorMessage(null);

    try {
      const res = await payWithWebLN(invoice);
      const proof: PaymentProof = {
        method: 'webln',
        preimage: res.preimage,
        bolt11: invoice,
        amountSats: quote.totalSats,
        settledAt: Math.floor(Date.now() / 1000),
        payerPubkey: user?.pubkey || '',
      };
      setSettledProof(proof);
      onSettled(proof);
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
      const proof: PaymentProof = {
        method: 'nwc',
        preimage: res.preimage,
        bolt11: invoice,
        amountSats: quote.totalSats,
        settledAt: Math.floor(Date.now() / 1000),
        payerPubkey: user?.pubkey || '',
      };
      setSettledProof(proof);
      onSettled(proof);
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

  // Copy Invoice
  const handleCopyInvoice = () => {
    if (invoice && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(invoice);
      setCopiedInvoice(true);
      setTimeout(() => setCopiedInvoice(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-zinc-200 bg-white text-zinc-900 p-6 sm:rounded-2xl shadow-2xl">
        <DialogHeader className="space-y-1 pb-3 border-b border-zinc-100 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-200/80 shadow-xs">
                <Zap className="h-4 w-4" />
              </div>
              <DialogTitle className="text-base font-bold text-zinc-950">
                {t.lightning.title}
              </DialogTitle>
            </div>
            {quote.isExempt ? (
              <Badge variant="official" className="gap-1 text-xs">
                <ShieldCheck className="h-3 w-3" />
                {t.lightning.adminBadge}
              </Badge>
            ) : (
              <Badge
                variant="default"
                className="font-mono text-xs bg-amber-50 text-amber-800 border-amber-200 shadow-xs"
              >
                {quote.totalSats} sats
              </Badge>
            )}
          </div>
          <DialogDescription className="text-xs text-zinc-500 pt-1 leading-relaxed">
            {quote.description}
          </DialogDescription>
        </DialogHeader>

        {/* Unauthenticated State */}
        {!user && (
          <div className="py-6 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 border border-zinc-200 text-amber-600 shadow-xs">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-zinc-900">
                {t.lightning.authRequiredTitle}
              </h3>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
                {t.lightning.authRequiredDesc}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-2 border-zinc-200 text-zinc-800 hover:bg-zinc-100"
              onClick={() => onOpenChange(false)}
            >
              {t.lightning.closeBtn}
            </Button>
          </div>
        )}

        {/* Admin Exemption Bypass View */}
        {user && quote.isExempt && (
          <div className="py-4 space-y-4">
            <div className="rounded-xl border border-amber-200/90 bg-amber-50/80 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                <ShieldCheck className="h-4 w-4 text-amber-600" />
                <span>{t.lightning.adminExemptTitle}</span>
              </div>
              <p className="text-xs text-amber-900/90 leading-relaxed">
                {t.lightning.adminExemptDesc}
              </p>
            </div>

            <Button
              variant="default"
              size="default"
              className="w-full gap-2 text-xs font-semibold shadow-xs bg-zinc-900 hover:bg-zinc-800 text-white"
              onClick={handleAdminBypass}
            >
              <Check className="h-4 w-4" />
              {t.lightning.adminBypassBtn}
            </Button>
          </div>
        )}

        {/* Settled Success State */}
        {user && settledProof && (
          <div className="py-4 space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-xs">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-emerald-800">
                {t.lightning.settledTitle}
              </h3>
              <p className="text-xs text-zinc-600">
                {settledProof.amountSats} {t.lightning.settledDesc}
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

        {/* Standard Payment Flow */}
        {user && !quote.isExempt && !settledProof && (
          <div className="space-y-4 pt-1">
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

            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as 'webln' | 'nwc' | 'qr')}
              className="w-full"
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
                      {t.lightning.weblnDesc}
                    </p>
                    <Button
                      variant="default"
                      size="default"
                      className="w-full gap-2 text-xs font-semibold shadow-xs bg-zinc-900 hover:bg-zinc-800 text-white"
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
                        : `${t.lightning.weblnPayBtn} (${quote.totalSats} sats)`}
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-3 text-center">
                    <p className="text-xs text-zinc-600 leading-relaxed">
                      {t.lightning.weblnNotFound}
                    </p>
                    <div className="flex gap-2 justify-center">
                      <a
                        href="https://getalby.com"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-amber-600 font-semibold hover:underline"
                      >
                        {t.lightning.installAlby}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs border-zinc-200 text-zinc-800 hover:bg-zinc-100"
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
                        className="h-6 px-1.5 text-[11px] text-zinc-500 hover:text-rose-600"
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
                      className="w-full gap-2 text-xs font-semibold shadow-xs bg-zinc-900 hover:bg-zinc-800 text-white"
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
                        : `${t.lightning.nwcPayBtn} (${quote.totalSats} sats)`}
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
                      className="w-full text-xs font-semibold shadow-xs bg-zinc-900 hover:bg-zinc-800 text-white"
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
                    <div className="mx-auto w-[220px] rounded-2xl border border-zinc-200 bg-white p-3 shadow-xs">
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
                        className="h-8 px-2.5 text-xs shrink-0 border-zinc-200 text-zinc-800 hover:bg-zinc-100"
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
  );
}

/**
 * Keypair Reveal Modal Component
 * photo.emre.xyz
 *
 * Secure one-time reveal for newly generated Nostr keypairs with masked nsec,
 * copy-to-clipboard, backup JSON download, and safety acknowledgement.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  Download,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { createKeyBackupJson, type NostrKeypair } from '@/lib/nostr/keys';
import { useI18n } from '@/lib/i18n/context';

export interface KeypairRevealModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keypair: NostrKeypair | null;
  onConfirm?: (keypair: NostrKeypair) => void;
}

export function KeypairRevealModal({
  open,
  onOpenChange,
  keypair,
  onConfirm,
}: KeypairRevealModalProps) {
  const { t } = useI18n();
  const [showNsec, setShowNsec] = useState(false);
  const [copiedNpub, setCopiedNpub] = useState(false);
  const [copiedNsec, setCopiedNsec] = useState(false);
  const [hasConfirmedBackup, setHasConfirmedBackup] = useState(false);

  if (!keypair) {
    return null;
  }

  const handleCopyNpub = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(keypair.npub);
      setCopiedNpub(true);
      setTimeout(() => setCopiedNpub(false), 2000);
    }
  };

  const handleCopyNsec = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(keypair.nsec);
      setCopiedNsec(true);
      setTimeout(() => setCopiedNsec(false), 2000);
    }
  };

  const handleDownloadBackup = () => {
    if (typeof window === 'undefined') return;

    const json = createKeyBackupJson({
      pubkey: keypair.pubkey,
      npub: keypair.npub,
      nsec: keypair.nsec,
    });

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nostr-keys-${keypair.npub.slice(0, 12)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setHasConfirmedBackup(true);
  };

  const handleProceed = () => {
    if (!hasConfirmedBackup) return;
    onConfirm?.(keypair);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-zinc-200 bg-white p-6 text-zinc-900 shadow-2xl sm:rounded-2xl">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 shadow-xs">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-zinc-950">
                {t.keypair.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 leading-relaxed">
                {t.keypair.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Security Warning Banner */}
        <div className="rounded-xl border border-amber-200/90 bg-amber-50/80 p-3.5 text-xs text-amber-950">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-amber-900">
                {t.keypair.warningTitle}
              </p>
              <p className="text-amber-800/90 leading-relaxed">
                {t.keypair.warningText}
              </p>
            </div>
          </div>
        </div>

        {/* Key Display Boxes */}
        <div className="space-y-3.5 py-1">
          {/* Public Key (npub) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-800">
                {t.keypair.npubLabel}
              </span>
              <Badge
                variant="outline"
                className="text-[10px] py-0 border-zinc-200 text-zinc-600"
              >
                {t.keypair.shareFreely}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50/70 px-3.5 py-2">
              <span className="font-mono text-xs text-zinc-800 truncate select-all">
                {keypair.npub}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/60"
                onClick={handleCopyNpub}
              >
                {copiedNpub ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span className="ml-1 text-[11px]">
                  {copiedNpub ? t.keypair.copied : t.keypair.copy}
                </span>
              </Button>
            </div>
          </div>

          {/* Secret Key (nsec) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-amber-800">
                {t.keypair.nsecLabel}
              </span>
              <Badge
                variant="destructive"
                className="text-[10px] py-0 bg-rose-50 text-rose-700 border border-rose-200"
              >
                {t.keypair.keepSecret}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-200/90 bg-amber-50/40 px-3.5 py-2">
              <span className="font-mono text-xs text-zinc-900 truncate select-all">
                {showNsec
                  ? keypair.nsec
                  : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-zinc-600 hover:text-zinc-950 hover:bg-amber-100/50"
                  onClick={() => setShowNsec(!showNsec)}
                  title={showNsec ? t.keypair.hideKey : t.keypair.showKey}
                >
                  {showNsec ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-zinc-600 hover:text-zinc-950 hover:bg-amber-100/50"
                  onClick={handleCopyNsec}
                >
                  {copiedNsec ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span className="ml-1 text-[11px]">
                    {copiedNsec ? t.keypair.copied : t.keypair.copy}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Download Backup Button */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 flex items-center justify-between gap-3">
          <div className="text-xs text-zinc-700">
            <p className="font-semibold text-zinc-900">
              {t.keypair.exportBackupTitle}
            </p>
            <p className="text-zinc-500 text-[11px] mt-0.5">
              {t.keypair.exportBackupDesc}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5 text-xs border-zinc-200 text-zinc-800 hover:bg-zinc-100 shadow-xs"
            onClick={handleDownloadBackup}
          >
            <Download className="h-3.5 w-3.5 text-amber-600" />
            {t.keypair.downloadBackupBtn}
          </Button>
        </div>

        {/* Confirmation Checkbox */}
        <label className="flex items-start gap-2.5 rounded-xl border border-zinc-200/90 bg-zinc-50/40 p-3 cursor-pointer text-xs text-zinc-700 hover:bg-zinc-50 transition-colors">
          <input
            type="checkbox"
            checked={hasConfirmedBackup}
            onChange={(e) => setHasConfirmedBackup(e.target.checked)}
            className="mt-0.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
          />
          <span className="leading-relaxed">
            {t.keypair.confirmAcknowledge}
          </span>
        </label>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-zinc-100">
          <Button
            type="button"
            variant="default"
            size="default"
            className="w-full sm:w-auto gap-2 shadow-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white"
            disabled={!hasConfirmedBackup}
            onClick={handleProceed}
          >
            <ShieldCheck className="h-4 w-4" />
            {t.keypair.proceedBtn}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

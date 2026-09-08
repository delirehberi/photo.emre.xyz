/**
 * Interactive Delete Request Manager Island
 * photo.emre.xyz
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Locale } from '@/lib/i18n/dictionary';
import { getDictionary } from '@/lib/i18n/context';
import {
  resolveUploaderKey,
  getClientLinks,
  buildDeleteRequestMessage,
} from '@/lib/nostr/delete-request';
import { useAuth } from '@/lib/nostr/auth/context';
import { getSharedRelayPool } from '@/lib/nostr/pool';
import { DEFAULT_RELAYS } from '@/lib/nostr/config';
import {
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  AlertTriangle,
  Send,
  HelpCircle,
  FileText,
  User,
  Hash,
  Link as LinkIcon,
  FolderArchive,
  RefreshCw,
} from 'lucide-react';

interface DeleteRequestManagerProps {
  initialLocale: Locale;
  initialPhotoHash?: string;
  initialPubkey?: string;
  initialAlbum?: string;
  initialUrl?: string;
}

export function DeleteRequestManager({
  initialLocale,
  initialPhotoHash = '',
  initialPubkey = '',
  initialAlbum = '',
  initialUrl = '',
}: DeleteRequestManagerProps) {
  const t = getDictionary(initialLocale);
  const { user, signer } = useAuth();

  const [photoHash, setPhotoHash] = useState(initialPhotoHash);
  const [photoUrl, setPhotoUrl] = useState(initialUrl);
  const [uploaderInput, setUploaderInput] = useState(initialPubkey);
  const [album, setAlbum] = useState(initialAlbum);
  const [reason, setReason] = useState<
    'likeness' | 'copyright' | 'privacy' | 'other'
  >('likeness');
  const [additionalNotes, setAdditionalNotes] = useState('');

  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedNpub, setCopiedNpub] = useState(false);
  const [isSendingDm, setIsSendingDm] = useState(false);
  const [dmStatus, setDmStatus] = useState<'idle' | 'success' | 'error'>(
    'idle',
  );
  const [dmErrorMessage, setDmErrorMessage] = useState('');

  // Extract query params from browser URL on mount if not provided via props
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const qPhoto = params.get('photo') || params.get('hash');
    const qPubkey =
      params.get('pubkey') || params.get('npub') || params.get('author');
    const qAlbum = params.get('album') || params.get('event');
    const qUrl = params.get('url') || params.get('image');

    if (qPhoto && !photoHash) setPhotoHash(qPhoto);
    if (qPubkey && !uploaderInput) setUploaderInput(qPubkey);
    if (qAlbum && !album) setAlbum(qAlbum);
    if (qUrl && !photoUrl) setPhotoUrl(qUrl);
  }, []);

  // Resolve uploader key
  const resolvedUploader = useMemo(() => {
    return resolveUploaderKey(uploaderInput);
  }, [uploaderInput]);

  // Client links for resolved npub
  const clientLinks = useMemo(() => {
    if (!resolvedUploader.npub) return null;
    return getClientLinks(resolvedUploader.npub);
  }, [resolvedUploader.npub]);

  // Generated message
  const generatedMessage = useMemo(() => {
    return buildDeleteRequestMessage({
      photoHash,
      photoUrl,
      uploaderPubkey: resolvedUploader.npub || uploaderInput,
      album,
      reason,
      additionalNotes,
      locale: initialLocale,
    });
  }, [
    photoHash,
    photoUrl,
    resolvedUploader.npub,
    uploaderInput,
    album,
    reason,
    additionalNotes,
    initialLocale,
  ]);

  const handleCopyMessage = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(generatedMessage);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2500);
    }
  }, [generatedMessage]);

  const handleCopyNpub = useCallback(() => {
    if (
      resolvedUploader.npub &&
      typeof navigator !== 'undefined' &&
      navigator.clipboard
    ) {
      navigator.clipboard.writeText(resolvedUploader.npub);
      setCopiedNpub(true);
      setTimeout(() => setCopiedNpub(false), 2000);
    }
  }, [resolvedUploader.npub]);

  // Send Direct Nostr DM if logged in
  const handleSendDm = async () => {
    if (!signer || !user || !resolvedUploader.hex) return;

    setIsSendingDm(true);
    setDmStatus('idle');
    setDmErrorMessage('');

    try {
      let ciphertext = '';
      if (signer.nip04Encrypt) {
        ciphertext = await signer.nip04Encrypt(
          resolvedUploader.hex,
          generatedMessage,
        );
      } else {
        throw new Error(
          initialLocale === 'en'
            ? 'Your Nostr signer does not support NIP-04 DM encryption. Please use Primal or another external client.'
            : 'Nostr cüzdanınız/eklentiniz NIP-04 DM şifrelemesini desteklemiyor. Lütfen Primal veya harici istemciyi kullanın.',
        );
      }

      const eventTemplate = {
        kind: 4, // NIP-04 Encrypted Direct Message
        created_at: Math.floor(Date.now() / 1000),
        tags: [['p', resolvedUploader.hex]],
        content: ciphertext,
      };

      const signedEvent = await signer.signEvent(eventTemplate);
      const pool = getSharedRelayPool();
      await pool.publishEvent(signedEvent, DEFAULT_RELAYS);

      setDmStatus('success');
    } catch (err: unknown) {
      setDmStatus('error');
      setDmErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSendingDm(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Notice Alert */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-50/50 p-5 sm:p-6 text-amber-950 flex items-start gap-3.5 shadow-xs">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs sm:text-sm leading-relaxed">
          <p className="font-semibold text-amber-900">
            {t.deleteRequest.badge}
          </p>
          <p className="text-amber-800">{t.deleteRequest.introAlert}</p>
        </div>
      </div>

      {/* Main Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Identifiers & Details Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-5">
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-600" />
              <span>{t.deleteRequest.formTitle}</span>
            </h2>

            {/* Photo SHA-256 */}
            <div className="space-y-1.5">
              <label
                htmlFor="photoHash"
                className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5"
              >
                <Hash className="h-3.5 w-3.5 text-zinc-400" />
                <span>{t.deleteRequest.photoHashLabel}</span>
              </label>
              <input
                id="photoHash"
                type="text"
                value={photoHash}
                onChange={(e) => setPhotoHash(e.target.value.trim())}
                placeholder={t.deleteRequest.photoHashPlaceholder}
                className="w-full h-10 px-3 rounded-lg border border-zinc-300 bg-zinc-50/50 font-mono text-xs text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition"
              />
            </div>

            {/* Media URL */}
            <div className="space-y-1.5">
              <label
                htmlFor="photoUrl"
                className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5"
              >
                <LinkIcon className="h-3.5 w-3.5 text-zinc-400" />
                <span>{t.deleteRequest.photoUrlLabel}</span>
              </label>
              <input
                id="photoUrl"
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value.trim())}
                placeholder={t.deleteRequest.photoUrlPlaceholder}
                className="w-full h-10 px-3 rounded-lg border border-zinc-300 bg-zinc-50/50 text-xs text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition"
              />
            </div>

            {/* Uploader Pubkey */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="uploaderInput"
                  className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5"
                >
                  <User className="h-3.5 w-3.5 text-zinc-400" />
                  <span>{t.deleteRequest.uploaderLabel}</span>
                </label>
                {resolvedUploader.isValid && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <Check className="h-3 w-3" />
                    Valid Nostr Key
                  </span>
                )}
              </div>
              <input
                id="uploaderInput"
                type="text"
                value={uploaderInput}
                onChange={(e) => setUploaderInput(e.target.value.trim())}
                placeholder={t.deleteRequest.uploaderPlaceholder}
                className="w-full h-10 px-3 rounded-lg border border-zinc-300 bg-zinc-50/50 font-mono text-xs text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition"
              />
            </div>

            {/* Album / Event */}
            <div className="space-y-1.5">
              <label
                htmlFor="album"
                className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5"
              >
                <FolderArchive className="h-3.5 w-3.5 text-zinc-400" />
                <span>{t.deleteRequest.albumLabel}</span>
              </label>
              <input
                id="album"
                type="text"
                value={album}
                onChange={(e) => setAlbum(e.target.value)}
                placeholder={t.deleteRequest.albumPlaceholder}
                className="w-full h-10 px-3 rounded-lg border border-zinc-300 bg-zinc-50/50 text-xs text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition"
              />
            </div>

            {/* Reason Selector */}
            <div className="space-y-1.5">
              <label
                htmlFor="reason"
                className="text-xs font-semibold text-zinc-700"
              >
                {t.deleteRequest.reasonLabel}
              </label>
              <select
                id="reason"
                value={reason}
                onChange={(e) =>
                  setReason(
                    e.target.value as
                      'likeness' | 'copyright' | 'privacy' | 'other',
                  )
                }
                className="w-full h-10 px-3 rounded-lg border border-zinc-300 bg-zinc-50/50 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition"
              >
                <option value="likeness">
                  {t.deleteRequest.reasonLikeness}
                </option>
                <option value="privacy">{t.deleteRequest.reasonPrivacy}</option>
                <option value="copyright">
                  {t.deleteRequest.reasonCopyright}
                </option>
                <option value="other">{t.deleteRequest.reasonOther}</option>
              </select>
            </div>

            {/* Additional Notes */}
            <div className="space-y-1.5">
              <label
                htmlFor="additionalNotes"
                className="text-xs font-semibold text-zinc-700"
              >
                {t.deleteRequest.additionalDetailsLabel}
              </label>
              <textarea
                id="additionalNotes"
                rows={3}
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder={t.deleteRequest.additionalDetailsPlaceholder}
                className="w-full p-3 rounded-lg border border-zinc-300 bg-zinc-50/50 text-xs text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition resize-none"
              />
            </div>
          </div>

          {/* Step Guide Helper */}
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-amber-600" />
              <span>{t.deleteRequest.howItWorksTitle}</span>
            </h3>
            <div className="space-y-2 text-xs text-zinc-600 leading-relaxed">
              <p>{t.deleteRequest.step1Guide}</p>
              <p>{t.deleteRequest.step2Guide}</p>
              <p>{t.deleteRequest.step3Guide}</p>
            </div>
          </div>
        </div>

        {/* Right: Actions, Uploader Contact & Generated Message */}
        <div className="lg:col-span-5 space-y-6">
          {/* Resolved Uploader & Quick Contact Card */}
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-5">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 tracking-tight">
                {t.deleteRequest.contactUploaderTitle}
              </h2>
              <p className="mt-1 text-xs text-zinc-600 leading-relaxed">
                {t.deleteRequest.contactUploaderDesc}
              </p>
            </div>

            {resolvedUploader.isValid && resolvedUploader.npub ? (
              <div className="space-y-4">
                {/* Resolved npub display */}
                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      {t.deleteRequest.resolvedNpub}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyNpub}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-600 hover:text-zinc-900"
                    >
                      {copiedNpub ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span className="text-emerald-600">
                            {t.deleteRequest.copiedNpub}
                          </span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>{t.deleteRequest.copyNpub}</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="font-mono text-xs text-zinc-800 break-all select-all">
                    {resolvedUploader.npub}
                  </p>
                </div>

                {/* Client Launch Buttons */}
                {clientLinks && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <a
                      href={clientLinks.primal}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-xs transition"
                    >
                      <span>{t.deleteRequest.openInPrimal}</span>
                      <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
                    </a>

                    <a
                      href={clientLinks.njump}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-zinc-300 hover:bg-zinc-50 text-zinc-800 text-xs font-semibold transition"
                    >
                      <span>{t.deleteRequest.openInNjump}</span>
                      <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
                    </a>

                    <a
                      href={clientLinks.coracle}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-zinc-300 hover:bg-zinc-50 text-zinc-800 text-xs font-semibold transition"
                    >
                      <span>{t.deleteRequest.openInCoracle}</span>
                      <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
                    </a>

                    <a
                      href={clientLinks.native}
                      className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-amber-300 bg-amber-50/50 hover:bg-amber-100/60 text-amber-900 text-xs font-semibold transition"
                    >
                      <span>{t.deleteRequest.openInNostrApp}</span>
                    </a>
                  </div>
                )}

                {/* Direct Nostr DM if authenticated */}
                {user && signer && (
                  <div className="pt-2 border-t border-zinc-200/80 space-y-2">
                    <button
                      type="button"
                      onClick={handleSendDm}
                      disabled={isSendingDm}
                      className="w-full h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold text-xs inline-flex items-center justify-center gap-2 shadow-xs transition disabled:opacity-60"
                    >
                      {isSendingDm ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          <span>{t.deleteRequest.sendDirectDm}</span>
                        </>
                      )}
                    </button>

                    {dmStatus === 'success' && (
                      <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>{t.deleteRequest.dmSentSuccess}</span>
                      </div>
                    )}

                    {dmStatus === 'error' && (
                      <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">
                        {dmErrorMessage}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 text-center space-y-2">
                <User className="h-8 w-8 text-zinc-400 mx-auto" />
                <p className="text-xs text-zinc-500">
                  {t.deleteRequest.emptyUploaderNotice}
                </p>
              </div>
            )}
          </div>

          {/* Pre-Composed Message Box */}
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-amber-600" />
                <span>{t.deleteRequest.messageTemplateLabel}</span>
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800"
              >
                {copiedMessage ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-600">
                      {t.deleteRequest.messageCopied}
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>{t.deleteRequest.copyMessageBtn}</span>
                  </>
                )}
              </button>
            </div>

            <textarea
              readOnly
              rows={10}
              value={generatedMessage}
              className="w-full p-3 rounded-xl border border-zinc-200 bg-zinc-50 font-mono text-xs text-zinc-800 leading-relaxed select-all resize-none focus:outline-none"
            />

            <button
              type="button"
              onClick={handleCopyMessage}
              className="w-full h-10 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs inline-flex items-center justify-center gap-2 shadow-xs transition"
            >
              <Copy className="h-4 w-4" />
              <span>{t.deleteRequest.copyMessageBtn}</span>
            </button>
          </div>

          {/* Fallback Escalation Box */}
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-zinc-900">
              {t.deleteRequest.fallbackTitle}
            </h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              {t.deleteRequest.fallbackDesc}
            </p>
            <div className="space-y-2 pt-1 text-xs text-zinc-700">
              <p className="p-3 rounded-lg bg-zinc-50 border border-zinc-200/80">
                <strong>{t.deleteRequest.blossomTakedownTitle}:</strong>{' '}
                {t.deleteRequest.blossomTakedownDesc}
              </p>
              <p className="p-3 rounded-lg bg-zinc-50 border border-zinc-200/80">
                {t.deleteRequest.escalateToPlatform}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

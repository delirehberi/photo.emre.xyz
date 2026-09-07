import { useState, useEffect, useCallback } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { PhotoMetadata } from '@/lib/nostr/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n/context';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  Info,
  Camera,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getThumbnailUrl } from '@/lib/media';

export interface LightboxProps {
  photos: PhotoMetadata[];
  activePhoto: PhotoMetadata | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizerPubkey?: string;
  albumTitle?: string;
  defaultExifOpen?: boolean;
}

export function Lightbox({
  photos,
  activePhoto,
  open,
  onOpenChange,
  organizerPubkey,
  albumTitle,
  defaultExifOpen = false,
}: LightboxProps) {
  const { t } = useI18n();
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isExifOpen, setIsExifOpen] = useState(defaultExifOpen);
  const [copiedHash, setCopiedHash] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  // Sync index when activePhoto changes
  useEffect(() => {
    if (activePhoto && photos.length > 0) {
      const idx = photos.findIndex(
        (p) => p.sha256.toLowerCase() === activePhoto.sha256.toLowerCase(),
      );
      if (idx !== -1) {
        setCurrentIndex(idx);
      }
    }
  }, [activePhoto, photos]);

  const currentPhoto = photos[currentIndex] || activePhoto;

  // Deep-link synchronization: update ?photo=<sha256> on active photo change
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (open && currentPhoto) {
      const url = new URL(window.location.href);
      if (url.searchParams.get('photo') !== currentPhoto.sha256) {
        url.searchParams.set('photo', currentPhoto.sha256);
        window.history.replaceState({}, '', url.toString());
      }
    } else if (!open) {
      const url = new URL(window.location.href);
      if (url.searchParams.has('photo')) {
        url.searchParams.delete('photo');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [open, currentPhoto]);

  // Handle browser back / forward navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      const url = new URL(window.location.href);
      const photoParam = url.searchParams.get('photo');
      if (photoParam) {
        const foundIndex = photos.findIndex(
          (p) => p.sha256.toLowerCase() === photoParam.toLowerCase(),
        );
        if (foundIndex !== -1) {
          setCurrentIndex(foundIndex);
          onOpenChange(true);
        }
      } else if (open) {
        onOpenChange(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [open, photos, onOpenChange]);

  const handlePrevious = useCallback(() => {
    if (photos.length <= 1) return;
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  }, [photos.length]);

  const handleNext = useCallback(() => {
    if (photos.length <= 1) return;
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  }, [photos.length]);

  // Global keyboard listener for navigation and actions
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        setIsExifOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handlePrevious, handleNext]);

  // Touch swipe support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    // Minimum swipe threshold 50px
    if (diff > 50) {
      handleNext();
    } else if (diff < -50) {
      handlePrevious();
    }
    setTouchStart(null);
  };

  const handleCopyHash = () => {
    if (!currentPhoto) return;
    navigator.clipboard?.writeText(currentPhoto.sha256);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  if (!currentPhoto) {
    return null;
  }

  const isCommunity =
    organizerPubkey &&
    currentPhoto.pubkey.toLowerCase() !== organizerPubkey.toLowerCase();

  const downloadUrl = `/api/download/${currentPhoto.sha256}?album=${encodeURIComponent(
    currentPhoto.albumCoordinate,
  )}`;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Fullscreen backdrop overlay */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* Fullscreen Content */}
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col justify-between overflow-hidden outline-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Top Control Bar */}
          <div className="relative z-30 flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/70 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs font-semibold text-zinc-300">
                {currentIndex + 1} {t.lightbox.of} {photos.length}
              </span>
              {albumTitle && (
                <span className="hidden sm:inline-block text-xs text-zinc-500 truncate max-w-xs">
                  &bull; {albumTitle}
                </span>
              )}
              {isCommunity && (
                <Badge
                  variant="community"
                  className="text-[10px] py-0.5 px-2 bg-indigo-950/80 border-indigo-500/40"
                >
                  {t.lightbox.communityBadge}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={isExifOpen ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsExifOpen((prev) => !prev)}
                className="h-8 text-xs gap-1.5"
                title={`${t.lightbox.exifInfo} (i)`}
              >
                <Info className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t.lightbox.exifInfo}</span>
              </Button>

              <a
                href={downloadUrl}
                download
                className="inline-flex items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-800 hover:text-white h-8 gap-1.5"
                title={t.lightbox.downloadWatermarked}
              >
                <Download className="h-3.5 w-3.5 text-amber-400" />
                <span className="hidden sm:inline">
                  {t.lightbox.downloadWatermarked}
                </span>
              </a>

              <DialogPrimitive.Close asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-zinc-400 hover:text-white"
                  title={t.lightbox.close}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">{t.lightbox.close}</span>
                </Button>
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* Main Visual Canvas with Navigation Chevrons */}
          <div className="relative flex flex-1 items-center justify-center p-2 sm:p-6 overflow-hidden">
            {/* Previous Photo Button */}
            {photos.length > 1 && (
              <button
                type="button"
                onClick={handlePrevious}
                className="absolute left-4 z-20 hidden sm:flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-300 border border-zinc-800 backdrop-blur-sm transition-all hover:bg-zinc-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                aria-label={t.lightbox.prevPhoto}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {/* Display Image Container */}
            <div className="relative max-h-full max-w-full flex items-center justify-center">
              <img
                key={currentPhoto.sha256}
                src={currentPhoto.url}
                alt={
                  currentPhoto.alt ||
                  currentPhoto.summary ||
                  'Enlarged photo view'
                }
                className="max-h-[82vh] max-w-[95vw] sm:max-w-[85vw] object-contain rounded-lg shadow-2xl transition-all duration-300 select-none animate-in fade-in-50 zoom-in-95"
              />
            </div>

            {/* Next Photo Button */}
            {photos.length > 1 && (
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-4 z-20 hidden sm:flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-300 border border-zinc-800 backdrop-blur-sm transition-all hover:bg-zinc-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                aria-label={t.lightbox.nextPhoto}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}

            {/* Collapsible EXIF Metadata Drawer / Side Overlay */}
            {isExifOpen && (
              <div
                className="absolute right-0 top-0 bottom-0 z-30 w-full sm:w-80 border-l border-zinc-800 bg-zinc-950/95 p-5 backdrop-blur-xl shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200"
                role="region"
                aria-label={t.lightbox.photographicMetadata}
              >
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-4">
                  <div className="flex items-center gap-2 text-zinc-100 font-semibold text-sm">
                    <Camera className="h-4 w-4 text-amber-400" />
                    {t.lightbox.photographicMetadata}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsExifOpen(false)}
                    className="h-7 w-7 text-zinc-400 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Caption / Summary */}
                  {currentPhoto.summary && (
                    <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-3">
                      <span className="text-[11px] font-medium text-zinc-400 block mb-1">
                        {t.lightbox.caption}
                      </span>
                      <p className="text-zinc-200 leading-relaxed">
                        {currentPhoto.summary}
                      </p>
                    </div>
                  )}

                  {/* Camera & Lens */}
                  <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-3 space-y-2">
                    <span className="text-[11px] font-medium text-zinc-400 block border-b border-zinc-800/60 pb-1">
                      {t.lightbox.cameraOptics}
                    </span>
                    <div className="flex justify-between items-center text-zinc-300">
                      <span className="text-zinc-500">{t.lightbox.camera}</span>
                      <span className="font-medium text-zinc-100">
                        {currentPhoto.exif?.model ||
                          currentPhoto.exif?.make ||
                          'Unknown'}
                      </span>
                    </div>
                    {currentPhoto.exif?.lens && (
                      <div className="flex justify-between items-center text-zinc-300">
                        <span className="text-zinc-500">{t.lightbox.lens}</span>
                        <span className="font-medium text-zinc-100 truncate max-w-[170px]">
                          {currentPhoto.exif.lens}
                        </span>
                      </div>
                    )}
                    {currentPhoto.exif?.focalLength && (
                      <div className="flex justify-between items-center text-zinc-300">
                        <span className="text-zinc-500">
                          {t.lightbox.focalLength}
                        </span>
                        <span className="font-medium text-zinc-100">
                          {currentPhoto.exif.focalLength}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Exposure Settings Grid */}
                  <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-3 space-y-2">
                    <span className="text-[11px] font-medium text-zinc-400 block border-b border-zinc-800/60 pb-1">
                      {t.lightbox.exposureParameters}
                    </span>
                    <div className="grid grid-cols-3 gap-2 text-center pt-1">
                      <div className="rounded bg-zinc-900/90 p-2 border border-zinc-800/50">
                        <span className="text-[10px] text-zinc-500 block">
                          {t.lightbox.shutter}
                        </span>
                        <span className="font-mono text-zinc-200 font-semibold mt-0.5 block">
                          {currentPhoto.exif?.shutterSpeed || t.lightbox.auto}
                        </span>
                      </div>
                      <div className="rounded bg-zinc-900/90 p-2 border border-zinc-800/50">
                        <span className="text-[10px] text-zinc-500 block">
                          {t.lightbox.aperture}
                        </span>
                        <span className="font-mono text-zinc-200 font-semibold mt-0.5 block">
                          {currentPhoto.exif?.aperture || t.lightbox.auto}
                        </span>
                      </div>
                      <div className="rounded bg-zinc-900/90 p-2 border border-zinc-800/50">
                        <span className="text-[10px] text-zinc-500 block">
                          {t.lightbox.iso}
                        </span>
                        <span className="font-mono text-zinc-200 font-semibold mt-0.5 block">
                          {currentPhoto.exif?.iso || t.lightbox.auto}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dimensions & Resolution */}
                  <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-3 space-y-2">
                    <span className="text-[11px] font-medium text-zinc-400 block border-b border-zinc-800/60 pb-1">
                      {t.lightbox.technicalInfo}
                    </span>
                    <div className="flex justify-between items-center text-zinc-300">
                      <span className="text-zinc-500">
                        {t.lightbox.dimensions}
                      </span>
                      <span className="font-mono text-zinc-100">
                        {currentPhoto.dimensions.width} &times;{' '}
                        {currentPhoto.dimensions.height}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-300">
                      <span className="text-zinc-500">
                        {t.lightbox.aspectRatio}
                      </span>
                      <span className="font-mono text-zinc-100">
                        {currentPhoto.dimensions.aspectRatio}:1
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-300">
                      <span className="text-zinc-500">{t.lightbox.format}</span>
                      <span className="font-mono uppercase text-zinc-100">
                        {currentPhoto.mimeType.replace('image/', '')}
                      </span>
                    </div>
                    {currentPhoto.exif?.dateTimeOriginal && (
                      <div className="flex justify-between items-center text-zinc-300">
                        <span className="text-zinc-500">
                          {t.lightbox.captured}
                        </span>
                        <span className="font-mono text-zinc-300">
                          {currentPhoto.exif.dateTimeOriginal}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Nostr Identity & SHA-256 Hash */}
                  <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-3 space-y-2">
                    <span className="text-[11px] font-medium text-zinc-400 block border-b border-zinc-800/60 pb-1">
                      {t.lightbox.provenance}
                    </span>
                    <div>
                      <span className="text-[10px] text-zinc-500 block mb-1">
                        {t.lightbox.sha256Hash}
                      </span>
                      <div className="flex items-center justify-between rounded bg-zinc-950 p-2 font-mono text-[11px] text-zinc-300 border border-zinc-800">
                        <span className="truncate mr-2">
                          {currentPhoto.sha256}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyHash}
                          className="text-zinc-400 hover:text-white p-0.5"
                          title={t.lightbox.copyHash}
                        >
                          {copiedHash ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="pt-1">
                      <span className="text-[10px] text-zinc-500 block mb-1">
                        {t.lightbox.authorPubkey}
                      </span>
                      <span className="font-mono text-[11px] text-zinc-400 break-all">
                        {currentPhoto.pubkey}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Thumbnails Navigation Strip */}
          {photos.length > 1 && (
            <div className="relative z-30 flex items-center justify-center gap-2 border-t border-zinc-800/80 bg-zinc-950/70 p-3 backdrop-blur-md overflow-x-auto max-w-full">
              {photos.map((p, idx) => (
                <button
                  key={p.sha256}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={cn(
                    'relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border transition-all duration-200 focus:outline-none',
                    idx === currentIndex
                      ? 'border-amber-400 ring-2 ring-amber-400/40 scale-105'
                      : 'border-zinc-800 opacity-60 hover:opacity-100',
                  )}
                  aria-label={t.lightbox.jumpToPhoto.replace(
                    '{index}',
                    String(idx + 1),
                  )}
                >
                  <img
                    src={getThumbnailUrl(p.url)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

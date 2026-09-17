import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  UploadProgress,
  type UploadStatus,
} from '@/components/ui/upload-progress';
import { useAuth } from '@/lib/nostr/auth/context';
import { useI18n } from '@/lib/i18n/context';
import { AuthModal } from '@/components/auth/AuthModal';
import { BlossomClient } from '@/lib/blossom/client';
import { calculateBlobSha256 } from '@/lib/blossom/hasher';
import { extractImageDimensions } from '@/lib/media/dimensions';
import { extractExifFromBlob } from '@/lib/media/exif';
import {
  createPhotoEventTemplate,
  createPictureEventTemplate,
  extractPhotosFromEvent,
} from '@/lib/nostr/schemas/photo';
import { PhotoUploadSchema } from '@/lib/nostr/schemas/forms';
import { getSharedRelayPool } from '@/lib/nostr/pool';
import { DEFAULT_RELAYS } from '@/lib/nostr/config';
import { BlossomServerSelector } from '@/components/blossom/BlossomServerSelector';
import { useBlossomServer } from '@/lib/blossom/useBlossomServer';
import { DEFAULT_BLOSSOM_SERVER_URL } from '@/lib/blossom/servers';
import type { PhotoMetadata, PhotoExif } from '@/lib/nostr/types';
import {
  ImagePlus,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Users,
  KeyRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QueueItem {
  id: string;
  file: File;
  fileName: string;
  fileSize: number;
  thumbnailUrl: string;
  dimensions?: { width: number; height: number };
  exif?: PhotoExif;
  sha256?: string;
  status: UploadStatus;
  progress: number;
  error?: string;
  publishedPhoto?: PhotoMetadata;
}

export interface UploadDrawerProps {
  albumCoordinate: string;
  organizerPubkey: string;
  albumTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess?: (photos: PhotoMetadata[]) => void;
  blossomServerUrl?: string;
  initialQueue?: QueueItem[];
}

export function UploadDrawer({
  albumCoordinate,
  organizerPubkey,
  albumTitle,
  open,
  onOpenChange,
  onUploadSuccess,
  blossomServerUrl,
  initialQueue,
}: UploadDrawerProps) {
  const { user, signer } = useAuth();
  const { t } = useI18n();
  const { selectedServerUrl, setSelectedServerUrl } = useBlossomServer();
  const [activeServerUrl, setActiveServerUrl] = useState<string>(
    blossomServerUrl || selectedServerUrl,
  );

  useEffect(() => {
    if (blossomServerUrl) {
      setActiveServerUrl(blossomServerUrl);
    } else if (selectedServerUrl) {
      setActiveServerUrl(selectedServerUrl);
    }
  }, [blossomServerUrl, selectedServerUrl]);

  const [queue, setQueue] = useState<QueueItem[]>(initialQueue || []);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Process selected files: extract SHA-256, dimensions, and EXIF client-side
  const processFiles = useCallback(async (files: FileList | File[]) => {
    setIsProcessingFiles(true);
    setGeneralError(null);
    setUploadComplete(false);

    const newItems: QueueItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const thumbnailUrl = URL.createObjectURL(file);

      newItems.push({
        id,
        file,
        fileName: file.name,
        fileSize: file.size,
        thumbnailUrl,
        status: 'hashing',
        progress: 0,
      });
    }

    setQueue((prev) => [...prev, ...newItems]);
    setIsProcessingFiles(false);

    // Asynchronously compute hashes, dimensions, and EXIF
    for (const item of newItems) {
      try {
        const [sha256, dims, exif] = await Promise.all([
          calculateBlobSha256(item.file),
          extractImageDimensions(item.file).catch(() => ({
            width: 1920,
            height: 1080,
            aspectRatio: 1.7778,
          })),
          extractExifFromBlob(item.file).catch(() => null),
        ]);

        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  sha256,
                  dimensions: { width: dims.width, height: dims.height },
                  exif: exif || undefined,
                  status: 'idle',
                }
              : q,
          ),
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Analysis failed';
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: 'error', error: msg } : q,
          ),
        );
      }
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveQueueItem = (id: string) => {
    setQueue((prev) => {
      const item = prev.find((q) => q.id === id);
      if (item?.thumbnailUrl) {
        URL.revokeObjectURL(item.thumbnailUrl);
      }
      return prev.filter((q) => q.id !== id);
    });
  };

  const handleStartUpload = async () => {
    if (!user || !signer) {
      setGeneralError('Please connect your Nostr account to publish photos.');
      return;
    }

    if (signer.type === 'readOnly') {
      setGeneralError(
        'Read-only accounts cannot sign Nostr events. Connect via NIP-07 or NIP-46.',
      );
      return;
    }

    if (queue.length === 0) {
      setGeneralError('Please add at least one image to upload.');
      return;
    }

    setGeneralError(null);
    setIsUploading(true);

    try {
      // 1. Direct Blossom Uploads
      const targetServer =
        activeServerUrl || selectedServerUrl || DEFAULT_BLOSSOM_SERVER_URL;
      const blossom = new BlossomClient(targetServer);
      const pool = getSharedRelayPool();

      interface UploadedSuccess {
        item: QueueItem;
        descriptor: { url: string; sha256: string };
      }
      const successfulUploads: UploadedSuccess[] = [];

      for (const item of queue) {
        if (item.status === 'completed') continue;

        const validation = PhotoUploadSchema.safeParse({
          fileName: item.fileName,
          fileSize: item.fileSize,
          mimeType: item.file.type || 'image/jpeg',
          dimensions: item.dimensions || { width: 1920, height: 1080 },
          sha256: item.sha256 || '0'.repeat(64),
        });

        if (!validation.success) {
          const msg =
            validation.error.issues[0]?.message ||
            'Fotoğraf doğrulaması başarısız oldu.';
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id ? { ...q, status: 'error', error: msg } : q,
            ),
          );
          continue;
        }

        // Update to authorizing
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, status: 'authorizing', progress: 10 }
              : q,
          ),
        );

        try {
          // Upload directly to Blossom serverless with NIP-98 auth
          const descriptor = await blossom.uploadBlob(item.file, {
            signer: (template) => signer.signEvent(template),
            onProgress: (p) => {
              setQueue((prev) =>
                prev.map((q) =>
                  q.id === item.id
                    ? { ...q, status: 'uploading', progress: p.percent }
                    : q,
                ),
              );
            },
          });

          successfulUploads.push({ item, descriptor });
        } catch (itemErr: unknown) {
          const errMsg =
            itemErr instanceof Error ? itemErr.message : 'Upload failed';
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id ? { ...q, status: 'error', error: errMsg } : q,
            ),
          );
        }
      }

      if (successfulUploads.length === 0) {
        setIsUploading(false);
        setGeneralError(t.upload.uploadServerFailed);
        return;
      }

      // 2. Build Single NIP-68 Kind 20 (or Kind 1063 for 1 file) Nostr Event Template
      const template =
        successfulUploads.length > 1
          ? createPictureEventTemplate({
              albumCoordinate,
              title: albumTitle || undefined,
              items: successfulUploads.map(({ item, descriptor }) => ({
                url: descriptor.url,
                sha256: descriptor.sha256,
                dimensions: item.dimensions || { width: 1920, height: 1080 },
                mimeType: item.file.type || 'image/jpeg',
                alt: item.fileName,
                summary: item.fileName.replace(/\.[^/.]+$/, ''),
                exif: item.exif,
              })),
            })
          : createPhotoEventTemplate({
              url: successfulUploads[0].descriptor.url,
              sha256: successfulUploads[0].descriptor.sha256,
              dimensions: successfulUploads[0].item.dimensions || {
                width: 1920,
                height: 1080,
              },
              albumCoordinate,
              mimeType: successfulUploads[0].item.file.type || 'image/jpeg',
              alt: successfulUploads[0].item.fileName,
              summary: successfulUploads[0].item.fileName.replace(
                /\.[^/.]+$/,
                '',
              ),
              exif: successfulUploads[0].item.exif,
            });

      // 3. Sign event once with user signer
      const signedEvent = await signer.signEvent(template);

      // 4. Broadcast event to Nostr relay mesh
      await pool.publishEvent(signedEvent, DEFAULT_RELAYS);

      // 5. Unpack published photos
      const publishedPhotos = extractPhotosFromEvent(signedEvent);

      // 6. Map published photos back to queue items
      setQueue((prev) =>
        prev.map((q) => {
          const matchedPhoto = publishedPhotos.find(
            (p) =>
              p.sha256.toLowerCase() === (q.sha256 || '').toLowerCase() ||
              p.url === q.thumbnailUrl,
          );
          if (matchedPhoto) {
            return {
              ...q,
              status: 'completed',
              progress: 100,
              publishedPhoto: matchedPhoto,
            };
          }
          return q;
        }),
      );

      setIsUploading(false);

      if (publishedPhotos.length === queue.length) {
        setUploadComplete(true);
      } else if (publishedPhotos.length > 0) {
        setUploadComplete(true);
        setGeneralError(
          `${queue.length - publishedPhotos.length} ${t.upload.uploadPartialError}`,
        );
      } else {
        setUploadComplete(false);
        setGeneralError(t.upload.uploadServerFailed);
      }

      if (publishedPhotos.length > 0) {
        // Trigger instant edge cache invalidation
        try {
          const authTemplate = {
            kind: 27235,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
              ['u', `${window.location.origin}/api/cache/invalidate`],
              ['method', 'POST'],
            ],
            content: 'Invalidate album edge cache',
          };
          const authEvent = await signer.signEvent(authTemplate);
          fetch('/api/cache/invalidate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              coordinate: albumCoordinate,
              hashes: publishedPhotos.map((p) => p.sha256),
              authEvent,
            }),
          }).catch((err) => {
            console.warn('Edge cache invalidation background warning:', err);
          });
        } catch (invErr) {
          console.warn(
            'Failed to sign edge cache invalidation auth event:',
            invErr,
          );
        }

        onUploadSuccess?.(publishedPhotos);
      }
    } catch (err: unknown) {
      setIsUploading(false);
      const msg =
        err instanceof Error ? err.message : 'Upload flow interrupted';
      setGeneralError(msg);
    }
  };

  const isOrganizer =
    user && user.pubkey.toLowerCase() === organizerPubkey.toLowerCase();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-2xl max-h-[88vh] flex flex-col p-6 rounded-2xl sm:rounded-3xl border border-zinc-200 bg-white text-zinc-900 shadow-2xl overflow-hidden">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base sm:text-lg flex items-center gap-2 font-bold text-zinc-900">
                  {isOrganizer ? (
                    <ShieldCheck className="h-5 w-5 text-amber-500" />
                  ) : (
                    <Users className="h-5 w-5 text-indigo-500" />
                  )}
                  <span>
                    {isOrganizer
                      ? t.album.uploadOfficialTitle
                      : t.album.uploadCommunityTitle}
                  </span>
                </DialogTitle>
                {albumTitle && (
                  <Badge
                    variant="outline"
                    className="text-xs font-normal border-zinc-200 text-zinc-700"
                  >
                    {albumTitle}
                  </Badge>
                )}
              </div>

              {/* Beta Free Badge */}
              <div>
                <Badge
                  variant="official"
                  className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 shadow-xs"
                >
                  {t.blossom.freeBetaBadge}
                </Badge>
              </div>
            </div>

            <DialogDescription className="text-xs text-zinc-500 text-left leading-relaxed">
              {isOrganizer ? t.album.officialDesc : t.album.communityDesc}
            </DialogDescription>
          </DialogHeader>

          {/* Scrollable Modal Body */}
          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
            {/* Authentication Guard & In-Modal Connect Action */}
            {!user ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 space-y-3 text-xs text-amber-950">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>{t.upload.authRequiredNotice}</span>
                  </div>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => setAuthModalOpen(true)}
                    className="h-8 gap-1.5 text-xs font-semibold shrink-0 shadow-xs bg-zinc-900 hover:bg-zinc-800 text-white"
                  >
                    <KeyRound className="h-3.5 w-3.5 text-amber-400" />
                    {t.upload.connectBtn}
                  </Button>
                </div>
                <div className="pt-2 border-t border-amber-200/60 flex flex-wrap items-center gap-2 text-[11px] text-amber-800">
                  <span>{t.upload.noAccountNotice}</span>
                  <a
                    href="https://nostr.org.tr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline hover:text-amber-950 inline-flex items-center gap-0.5"
                  >
                    nostr.org.tr <ExternalLink className="h-3 w-3" />
                  </a>
                  <span>&bull;</span>
                  <a
                    href="https://nostr.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline hover:text-amber-950 inline-flex items-center gap-0.5"
                  >
                    nostr.com <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ) : signer?.type === 'readOnly' ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 space-y-3 text-xs text-amber-950">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>{t.upload.readOnlyNotice}</span>
                  </div>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => setAuthModalOpen(true)}
                    className="h-8 gap-1.5 text-xs font-semibold shrink-0 shadow-xs bg-zinc-900 hover:bg-zinc-800 text-white"
                  >
                    <KeyRound className="h-3.5 w-3.5 text-amber-400" />
                    {t.upload.readOnlyConnectBtn}
                  </Button>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  {t.upload.readOnlyExplanation}
                </p>
              </div>
            ) : null}

            {/* Error Banner */}
            {generalError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{generalError}</span>
              </div>
            )}

            {/* Blossom Media Server Selection */}
            <BlossomServerSelector
              value={activeServerUrl}
              onChange={(url) => {
                setActiveServerUrl(url);
                setSelectedServerUrl(url);
              }}
            />

            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {/* Drag and Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-7 text-center transition-all cursor-pointer',
                isDragging
                  ? 'border-amber-500 bg-amber-50/60 scale-[0.99]'
                  : 'border-zinc-200 bg-zinc-50/50 hover:border-zinc-300 hover:bg-zinc-50',
              )}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100/80 text-amber-700 mb-2.5 shadow-xs">
                <ImagePlus className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-zinc-900">
                {t.upload.dropzoneText}
              </p>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                {t.upload.dropzoneSubtext}
              </p>
            </div>

            {/* Queue List */}
            {queue.length > 0 && (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                <div className="flex items-center justify-between text-xs text-zinc-500 px-1 font-medium">
                  <span>
                    {t.upload.queueTitle} ({queue.length})
                  </span>
                  {!isUploading && (
                    <button
                      type="button"
                      onClick={() => setQueue([])}
                      className="text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                    >
                      {t.upload.clearQueue}
                    </button>
                  )}
                </div>

                {queue.map((item) => (
                  <UploadProgress
                    key={item.id}
                    fileName={item.fileName}
                    fileSize={item.fileSize}
                    dimensions={item.dimensions}
                    sha256={item.sha256}
                    status={item.status}
                    progress={item.progress}
                    errorMessage={item.error}
                    onCancel={
                      !isUploading
                        ? () => handleRemoveQueueItem(item.id)
                        : undefined
                    }
                  />
                ))}
              </div>
            )}

            {/* Success Summary */}
            {uploadComplete && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-emerald-950">
                  {t.upload.successTitle}
                </h4>
                <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                  {t.upload.successDesc}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-zinc-100 mt-auto">
            <DialogClose asChild>
              <Button variant="outline" size="sm" className="border-zinc-200">
                {uploadComplete ? t.upload.closeBtn : t.upload.cancelBtn}
              </Button>
            </DialogClose>

            {!uploadComplete && (
              <Button
                variant="default"
                size="sm"
                onClick={handleStartUpload}
                disabled={
                  queue.length === 0 ||
                  isUploading ||
                  isProcessingFiles ||
                  !user ||
                  signer?.type === 'readOnly'
                }
                className="gap-1.5 shadow-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white"
              >
                <UploadCloud className="h-3.5 w-3.5 text-zinc-100" />
                <span>
                  {isUploading
                    ? t.upload.publishingBtn
                    : queue.length > 0
                      ? t.upload.uploadCountBtn.replace(
                          '{count}',
                          String(queue.length),
                        )
                      : t.upload.uploadBtn}
                </span>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Embedded Auth Modal */}
      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        defaultTab="extension"
      />
    </>
  );
}

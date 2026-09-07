import { useState, useRef, useEffect, useCallback, memo } from 'react';
import type { PhotoMetadata } from '@/lib/nostr/types';
import { Badge } from '@/components/ui/badge';
import { Maximize2, AlertCircle, RefreshCw, Users, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getThumbnailUrl } from '@/lib/media';

export interface PhotoCardProps {
  photo: PhotoMetadata;
  isCommunity?: boolean;
  priority?: boolean;
  onClick?: (photo: PhotoMetadata) => void;
  className?: string;
  forceLoadingState?: boolean;
  forceErrorState?: boolean;
}

export const PhotoCard = memo(function PhotoCard({
  photo,
  isCommunity = false,
  priority = false,
  onClick,
  className,
  forceLoadingState = false,
  forceErrorState = false,
}: PhotoCardProps) {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>(
    forceLoadingState ? 'loading' : forceErrorState ? 'error' : 'loading',
  );
  const imgRef = useRef<HTMLImageElement | null>(null);
  const displayUrl = getThumbnailUrl(photo.url);

  // Check if the image element is already complete (e.g. cached or loaded before hydration)
  const checkImageCompletion = useCallback((img: HTMLImageElement | null) => {
    if (!img) return;
    if (img.complete) {
      if (img.naturalWidth > 0) {
        setImageState('loaded');
      } else {
        setImageState('error');
      }
    }
  }, []);

  const handleImageRef = useCallback(
    (node: HTMLImageElement | null) => {
      imgRef.current = node;
      checkImageCompletion(node);
    },
    [checkImageCompletion],
  );

  useEffect(() => {
    if (forceLoadingState) {
      setImageState('loading');
      return;
    }
    if (forceErrorState) {
      setImageState('error');
      return;
    }

    const img = imgRef.current;
    if (img?.complete) {
      if (img.naturalWidth > 0) {
        setImageState('loaded');
      } else {
        setImageState('error');
      }
    } else {
      setImageState('loading');
    }
  }, [displayUrl, forceLoadingState, forceErrorState]);

  const aspectRatio = photo.dimensions.aspectRatio || 1.5;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(photo);
    }
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageState('loading');
    if (imgRef.current) {
      const currentSrc = imgRef.current.src;
      imgRef.current.src = '';
      imgRef.current.src = currentSrc;
    }
  };

  const isActuallyLoaded =
    !forceLoadingState && !forceErrorState && imageState === 'loaded';
  const isActuallyError = forceErrorState || imageState === 'error';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={
        photo.summary || photo.alt || `Photo ${photo.sha256.slice(0, 8)}`
      }
      onClick={() => onClick?.(photo)}
      onKeyDown={handleKeyDown}
      className={cn(
        'group relative w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 shadow-xs transition-all duration-300 hover:border-zinc-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 cursor-pointer select-none break-inside-avoid mb-4',
        className,
      )}
      style={{
        aspectRatio: `${aspectRatio}`,
      }}
    >
      {/* 1. Shimmer skeleton placeholder for zero Cumulative Layout Shift (CLS) */}
      {!isActuallyLoaded && !isActuallyError && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-100 animate-pulse motion-reduce:animate-none text-zinc-400"
          aria-label="Loading photo"
        >
          <Camera className="w-8 h-8 stroke-1 text-zinc-300 animate-bounce motion-reduce:animate-none mb-2" />
          <span className="text-[11px] font-mono text-zinc-400">
            {photo.dimensions.width} &times; {photo.dimensions.height}
          </span>
        </div>
      )}

      {/* 2. Error fallback state */}
      {isActuallyError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 bg-zinc-50 text-center">
          <AlertCircle className="w-7 h-7 text-red-500 mb-2" />
          <p className="text-xs font-semibold text-zinc-800 mb-1">
            Görsel Yüklenemedi
          </p>
          <p className="text-[10px] text-zinc-500 max-w-[180px] truncate mb-3 font-mono">
            SHA: {photo.sha256.slice(0, 16)}...
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-200 hover:bg-zinc-300 text-xs font-medium text-zinc-800 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Tekrar Dene
          </button>
        </div>
      )}

      {/* 3. High-res image element with lazy or priority loading */}
      {!forceErrorState && (
        <img
          ref={handleImageRef}
          src={displayUrl}
          alt={
            photo.alt || photo.summary || `Photo ${photo.sha256.slice(0, 8)}`
          }
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setImageState('loaded')}
          onError={() => setImageState('error')}
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-all duration-500 ease-out group-hover:scale-105',
            isActuallyLoaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}

      {/* 4. Top badges (Community uploader badge, EXIF indicator) */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        {isCommunity ? (
          <Badge
            variant="community"
            className="shadow-sm backdrop-blur-xs bg-indigo-50/90 border-indigo-200 text-indigo-900 text-[10px] py-0.5 px-2 font-medium"
          >
            <Users className="w-3 h-3 mr-1 text-indigo-600" />
            Topluluk
          </Badge>
        ) : (
          <span />
        )}

        {photo.exif && (
          <Badge
            variant="outline"
            className="shadow-sm backdrop-blur-xs bg-white/90 border-zinc-200 text-[10px] py-0.5 px-2 font-mono text-zinc-700"
          >
            {photo.exif.aperture || photo.exif.iso ? (
              <span>
                {photo.exif.aperture}{' '}
                {photo.exif.iso ? `ISO${photo.exif.iso}` : ''}
              </span>
            ) : (
              <Camera className="w-3 h-3 text-zinc-500" />
            )}
          </Badge>
        )}
      </div>

      {/* 5. Hover information overlay */}
      <div className="absolute inset-0 z-20 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/25 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100 text-white">
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">
              {photo.summary || photo.alt || 'Fotoğraf'}
            </p>
            <p className="text-[10px] font-mono text-zinc-300 mt-0.5">
              {photo.dimensions.width} &times; {photo.dimensions.height}
              {photo.exif?.model ? ` \u2022 ${photo.exif.model}` : ''}
            </p>
          </div>

          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-xs shadow-xs">
            <Maximize2 className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
});

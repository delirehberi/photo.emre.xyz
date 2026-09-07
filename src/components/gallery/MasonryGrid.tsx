import type { PhotoMetadata } from '@/lib/nostr/types';
import { PhotoCard } from './PhotoCard';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MasonryGridProps {
  photos: PhotoMetadata[];
  columns?: 1 | 2 | 3 | 4;
  organizerPubkey?: string;
  isCommunity?: boolean;
  onPhotoClick?: (photo: PhotoMetadata) => void;
  className?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

const columnClasses: Record<1 | 2 | 3 | 4, string> = {
  1: 'columns-1',
  2: 'columns-1 sm:columns-2',
  3: 'columns-1 sm:columns-2 lg:columns-3',
  4: 'columns-1 sm:columns-2 md:columns-3 lg:columns-4',
};

export function MasonryGrid({
  photos,
  columns,
  organizerPubkey,
  isCommunity = false,
  onPhotoClick,
  className,
  emptyTitle = 'No photos published yet',
  emptyDescription = 'Photos uploaded to this album will appear here in high resolution.',
}: MasonryGridProps) {
  if (!photos || photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800/80 bg-zinc-900/20 py-16 px-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800/60 text-zinc-500 mb-3">
          <ImageOff className="h-6 w-6" />
        </div>
        <h4 className="text-sm font-semibold text-zinc-200">{emptyTitle}</h4>
        <p className="mt-1 text-xs text-zinc-400 max-w-sm">
          {emptyDescription}
        </p>
      </div>
    );
  }

  const gridClass = columns
    ? columnClasses[columns]
    : 'columns-1 sm:columns-2 md:columns-3 lg:columns-4';

  return (
    <div
      className={cn(
        gridClass,
        'gap-4 w-full transition-all duration-300',
        className,
      )}
    >
      {photos.map((photo, index) => {
        const photoIsCommunity =
          isCommunity ||
          (organizerPubkey
            ? photo.pubkey.toLowerCase() !== organizerPubkey.toLowerCase()
            : false);

        return (
          <PhotoCard
            key={photo.id || `${photo.sha256}-${index}`}
            photo={photo}
            isCommunity={photoIsCommunity}
            priority={index < 4}
            onClick={onPhotoClick}
          />
        );
      })}
    </div>
  );
}

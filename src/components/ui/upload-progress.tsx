import * as React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  ImageIcon,
  Hash,
  Maximize2,
  RotateCw,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export type UploadStatus =
  'idle' | 'hashing' | 'authorizing' | 'uploading' | 'completed' | 'error';

export interface UploadProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  fileName: string;
  fileSize?: number;
  dimensions?: { width: number; height: number };
  sha256?: string;
  status: UploadStatus;
  progress?: number;
  errorMessage?: string;
  onRetry?: () => void;
  onCancel?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

export function UploadProgress({
  fileName,
  fileSize,
  dimensions,
  sha256,
  status,
  progress = 0,
  errorMessage,
  onRetry,
  onCancel,
  className,
  ...props
}: UploadProgressProps) {
  const clampedProgress = Math.min(100, Math.max(0, Math.round(progress)));

  const getStatusBadge = () => {
    switch (status) {
      case 'hashing':
        return (
          <Badge
            variant="secondary"
            className="bg-amber-500/10 text-amber-400 border-amber-500/20"
          >
            <Loader2 className="size-3 animate-spin" />
            Hashing SHA-256
          </Badge>
        );
      case 'authorizing':
        return (
          <Badge
            variant="secondary"
            className="bg-sky-500/10 text-sky-400 border-sky-500/20"
          >
            <Loader2 className="size-3 animate-spin" />
            NIP-98 Auth
          </Badge>
        );
      case 'uploading':
        return (
          <Badge
            variant="secondary"
            className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
          >
            <Loader2 className="size-3 animate-spin" />
            Uploading {clampedProgress}%
          </Badge>
        );
      case 'completed':
        return (
          <Badge
            variant="secondary"
            className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          >
            <CheckCircle2 className="size-3" />
            Uploaded
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertCircle className="size-3" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">Ready</Badge>;
    }
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-zinc-800 bg-zinc-900/90 p-4 text-zinc-100 shadow-lg backdrop-blur-sm transition-all',
        status === 'error' && 'border-red-900/60 bg-red-950/20',
        status === 'completed' && 'border-emerald-900/60 bg-emerald-950/20',
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
            {status === 'completed' ? (
              <CheckCircle2 className="size-5 text-emerald-400" />
            ) : status === 'error' ? (
              <AlertCircle className="size-5 text-red-400" />
            ) : (
              <ImageIcon className="size-5" />
            )}
          </div>
          <div className="min-w-0">
            <p
              className="truncate text-sm font-medium text-zinc-200"
              title={fileName}
            >
              {fileName}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              {fileSize !== undefined && <span>{formatBytes(fileSize)}</span>}
              {dimensions && (
                <span className="flex items-center gap-0.5">
                  <Maximize2 className="size-3 text-zinc-500" />
                  {dimensions.width}x{dimensions.height}
                </span>
              )}
              {sha256 && (
                <span
                  className="flex items-center gap-0.5 font-mono text-[11px] text-zinc-500"
                  title={sha256}
                >
                  <Hash className="size-3 text-zinc-600" />
                  {sha256.slice(0, 8)}...{sha256.slice(-6)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {getStatusBadge()}
          {onCancel && status !== 'completed' && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-zinc-400 hover:text-zinc-200"
              onClick={onCancel}
              title="Cancel"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {(status === 'uploading' ||
        status === 'hashing' ||
        status === 'authorizing') && (
        <div className="mt-3">
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300 ease-out',
                status === 'hashing' && 'w-1/3 animate-pulse bg-amber-500',
                status === 'authorizing' && 'w-2/3 animate-pulse bg-sky-500',
                status === 'uploading' && 'bg-indigo-500',
              )}
              style={
                status === 'uploading'
                  ? { width: `${clampedProgress}%` }
                  : undefined
              }
            />
          </div>
        </div>
      )}

      {/* Error Message & Retry */}
      {status === 'error' && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-red-950/40 px-3 py-2 text-xs text-red-300">
          <span className="truncate">
            {errorMessage || 'Upload failed. Please try again.'}
          </span>
          {onRetry && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-xs text-red-200 hover:bg-red-900/40"
              onClick={onRetry}
            >
              <RotateCw className="size-3" />
              Retry
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

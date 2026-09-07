/**
 * Blossom Media Server Selector Component
 * photo.emre.xyz
 *
 * Provides a clean, accessible interface to choose which Blossom server
 * to upload media to, displaying Primal CDN as the public default,
 * media.nostr.org.tr for community members, media.emre.xyz for authorized
 * organizations, and support for custom endpoints.
 */

import { useState, type SyntheticEvent } from 'react';
import {
  Server,
  Check,
  ChevronDown,
  Globe,
  Users,
  ShieldCheck,
  Plus,
  Trash2,
  Info,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useBlossomServer } from '@/lib/blossom/useBlossomServer';
import { isValidBlossomUrl } from '@/lib/blossom/servers';

export interface BlossomServerSelectorProps {
  /** Optional controlled server URL */
  value?: string;
  /** Optional change handler */
  onChange?: (url: string) => void;
  /** Additional container styling */
  className?: string;
}

export function BlossomServerSelector({
  value,
  onChange,
  className = '',
}: BlossomServerSelectorProps) {
  const {
    selectedServerUrl: hookServerUrl,
    setSelectedServerUrl: hookSetSelectedServerUrl,
    selectedServerOption,
    curatedServers,
    customServers,
    nostrServers,
    addCustomServer,
    removeCustomServer,
    loadingNostrServers,
  } = useBlossomServer();

  const activeUrl = value || hookServerUrl;
  const handleSelect = (url: string) => {
    if (onChange) {
      onChange(url);
    }
    hookSetSelectedServerUrl(url);
  };

  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInputUrl, setCustomInputUrl] = useState('');
  const [customInputError, setCustomInputError] = useState<string | null>(null);

  const handleAddCustom = (e: SyntheticEvent) => {
    e.preventDefault();
    setCustomInputError(null);

    if (!isValidBlossomUrl(customInputUrl)) {
      setCustomInputError('Lütfen geçerli bir HTTP veya HTTPS adresi giriniz.');
      return;
    }

    const success = addCustomServer(customInputUrl);
    if (success) {
      if (onChange) {
        onChange(customInputUrl);
      }
      setCustomInputUrl('');
      setShowCustomInput(false);
    } else {
      setCustomInputError('Geçersiz sunucu adresi.');
    }
  };

  // Determine helper message for the currently selected server
  const isNostrTr = activeUrl.includes('media.nostr.org.tr');
  const isEmreXyz = activeUrl.includes('media.emre.xyz');
  const isPrimal = activeUrl.includes('blossom.primal.net');

  return (
    <div
      className={`rounded-xl border border-zinc-200/90 bg-zinc-50/70 p-3.5 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100 ${className}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
            Medya Sunucusu (Blossom)
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2 border-zinc-300 bg-white px-3 text-xs font-medium shadow-xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            >
              <span className="truncate max-w-[180px] font-semibold">
                {selectedServerOption.name}
              </span>
              {selectedServerOption.badge && (
                <Badge
                  variant={
                    isNostrTr
                      ? 'community'
                      : isEmreXyz
                        ? 'official'
                        : 'secondary'
                  }
                  className="px-1.5 py-0 text-[10px]"
                >
                  {selectedServerOption.badge}
                </Badge>
              )}
              <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-80 p-1.5">
            <DropdownMenuLabel className="text-xs font-medium text-zinc-500">
              Önerilen Blossom Sunucuları
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {curatedServers.map((server) => {
                const isSelected = server.url === activeUrl;
                return (
                  <DropdownMenuItem
                    key={server.id}
                    onClick={() => handleSelect(server.url)}
                    className="flex items-start justify-between gap-2 p-2 cursor-pointer"
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 font-medium text-sm">
                        {server.name}
                        {server.badge && (
                          <Badge
                            variant={
                              server.id === 'nostr-tr'
                                ? 'community'
                                : server.id === 'emre-xyz'
                                  ? 'official'
                                  : 'secondary'
                            }
                            className="px-1.5 py-0 text-[10px]"
                          >
                            {server.badge}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-zinc-500 line-clamp-1">
                        {server.description}
                      </span>
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>

            {/* Kind 10063 Nostr user servers */}
            {nostrServers.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="flex items-center justify-between text-xs font-medium text-zinc-500">
                  <span>Profilinizdeki Sunucular (Kind 10063)</span>
                  {loadingNostrServers && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                  {nostrServers.map((server) => {
                    const isSelected = server.url === activeUrl;
                    return (
                      <DropdownMenuItem
                        key={server.id}
                        onClick={() => handleSelect(server.url)}
                        className="flex items-center justify-between p-2 cursor-pointer"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {server.name}
                          </span>
                          <span className="text-xs text-zinc-400 truncate max-w-[200px]">
                            {server.url}
                          </span>
                        </div>
                        {isSelected && (
                          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuGroup>
              </>
            )}

            {/* Custom user servers */}
            {customServers.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-medium text-zinc-500">
                  Özel Sunucularınız
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                  {customServers.map((server) => {
                    const isSelected = server.url === activeUrl;
                    return (
                      <div
                        key={server.id}
                        className="flex items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <button
                          type="button"
                          onClick={() => handleSelect(server.url)}
                          className="flex flex-1 items-center justify-between text-left"
                        >
                          <span className="truncate max-w-[190px] font-medium">
                            {server.url}
                          </span>
                          {isSelected && (
                            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeCustomServer(server.url);
                          }}
                          className="ml-2 p-1 text-zinc-400 hover:text-red-600"
                          title="Sunucuyu sil"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </DropdownMenuGroup>
              </>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setShowCustomInput(true)}
              className="flex items-center gap-2 text-xs font-medium text-zinc-600 cursor-pointer p-2"
            >
              <Plus className="h-3.5 w-3.5" />
              Özel Sunucu Adresi Ekle...
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Custom URL Input Field when expanded */}
      {showCustomInput && (
        <form
          onSubmit={handleAddCustom}
          className="mt-2.5 flex flex-col gap-1.5 border-t border-zinc-200/80 pt-2.5 dark:border-zinc-800"
        >
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="https://blossom.example.com"
              value={customInputUrl}
              onChange={(e) => setCustomInputUrl(e.target.value)}
              className="h-8 flex-1 rounded-md border border-zinc-300 bg-white px-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <Button type="submit" size="sm" className="h-8 px-3 text-xs">
              Ekle
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowCustomInput(false);
                setCustomInputError(null);
              }}
              className="h-8 px-2 text-xs"
            >
              İptal
            </Button>
          </div>
          {customInputError && (
            <p className="text-[11px] text-red-600 dark:text-red-400">
              {customInputError}
            </p>
          )}
        </form>
      )}

      {/* Contextual guidance note based on selected server */}
      <div className="mt-2 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
        {isPrimal && (
          <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
            <Globe className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <span>
              Hızlı genel erişimli varsayılan Blossom CDN. Herkese açıktır.
            </span>
          </div>
        )}
        {isNostrTr && (
          <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
            <Users className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            <span>
              <strong>nostr.org.tr</strong> topluluk üyelerine açıktır. Üye
              anahtarınızla NIP-98 imzalı yükleme yapabilirsiniz.
            </span>
          </div>
        )}
        {isEmreXyz && (
          <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>
              <strong>Özel Sunucu:</strong> Yetkili organizasyon veya yönetici
              anahtarları ile erişilebilir.
            </span>
          </div>
        )}
        {!isPrimal && !isNostrTr && !isEmreXyz && (
          <div className="flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <span>
              Seçilen sunucu:{' '}
              <code className="text-zinc-700 dark:text-zinc-300">
                {activeUrl}
              </code>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

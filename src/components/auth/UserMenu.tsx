/**
 * User Identity & Session Menu Component
 * photo.emre.xyz
 *
 * Displays active user session badge, admin indicator, and session management menu.
 */

import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  User,
  ShieldCheck,
  Copy,
  Check,
  LogOut,
  Settings,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/lib/nostr/auth/context';
import { useI18n } from '@/lib/i18n/context';

export function UserMenu() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  if (!user) {
    return null;
  }

  const handleCopyNpub = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(user.npub);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const truncatedNpub = `${user.npub.slice(0, 8)}...${user.npub.slice(-4)}`;
  const displayLabel = user.displayName || user.nip05 || truncatedNpub;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2 border-zinc-200 bg-white px-2.5 text-xs text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 shadow-xs"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 text-zinc-700">
            {user.isAdmin ? (
              <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
            ) : (
              <User className="h-3.5 w-3.5" />
            )}
          </div>
          <span className="font-medium text-xs max-w-[120px] truncate">
            {displayLabel}
          </span>
          {user.isAdmin && (
            <Badge variant="official" className="text-[10px] px-1 py-0 h-4">
              Admin
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 text-zinc-400" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-56 border-zinc-200 bg-white text-zinc-800 shadow-lg"
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900 truncate max-w-[140px]">
                {user.displayName || user.name || t.org.verifiedOrg}
              </span>
              <Badge
                variant="outline"
                className="text-[9px] uppercase px-1 py-0"
              >
                {user.type}
              </Badge>
            </div>
            {user.nip05 && (
              <span className="font-mono text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 truncate max-w-full block">
                {user.nip05}
              </span>
            )}
            <span className="font-mono text-[11px] text-zinc-500 truncate">
              {user.npub}
            </span>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-zinc-100" />

        <DropdownMenuItem
          onClick={handleCopyNpub}
          className="cursor-pointer text-xs"
        >
          {copied ? (
            <Check className="mr-2 h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <Copy className="mr-2 h-3.5 w-3.5 text-zinc-500" />
          )}
          <span>{copied ? t.common.copied : t.org.copyNpub}</span>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="cursor-pointer text-xs">
          <a href="/events/create" className="flex items-center">
            <Calendar className="mr-2 h-3.5 w-3.5 text-amber-600" />
            <span>{t.nav.createEvent}</span>
          </a>
        </DropdownMenuItem>

        {user.isAdmin && (
          <DropdownMenuItem asChild className="cursor-pointer text-xs">
            <a href="/admin" className="flex items-center">
              <Settings className="mr-2 h-3.5 w-3.5 text-amber-600" />
              <span>{t.nav.admin}</span>
            </a>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className="bg-zinc-100" />

        <DropdownMenuItem
          onClick={logout}
          className="cursor-pointer text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
        >
          <LogOut className="mr-2 h-3.5 w-3.5" />
          <span>{t.nav.disconnect}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

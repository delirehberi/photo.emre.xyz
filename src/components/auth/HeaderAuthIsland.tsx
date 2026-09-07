/**
 * Header Authentication Island Component
 * photo.emre.xyz
 *
 * Mounts in Header.astro to provide:
 * 1. Desktop: LanguageToggle, Connect button, or active UserMenu.
 * 2. Mobile: Clean hamburger menu with dropdown showing user Display Name / NIP-05,
 *    navigation items, authenticated actions, and language toggle.
 */

import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/lib/nostr/auth/context';
import {
  I18nProvider,
  useI18n,
  LanguageToggle,
  getLocalizedPath,
} from '@/lib/i18n/context';
import type { Locale } from '@/lib/i18n/dictionary';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  KeyRound,
  Menu,
  X,
  User,
  ShieldCheck,
  Calendar,
  Settings,
  LogOut,
  Copy,
  Check,
} from 'lucide-react';
import { AuthModal } from './AuthModal';
import { UserMenu } from './UserMenu';

export interface NavItem {
  href: string;
  label: string;
  isActive: boolean;
}

interface HeaderControlsProps {
  currentPath?: string;
  navItems?: NavItem[];
}

function HeaderControls({ currentPath, navItems = [] }: HeaderControlsProps) {
  const { user, logout } = useAuth();
  const { t, locale } = useI18n();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Close mobile menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleCopyNpub = () => {
    if (user && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(user.npub);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const truncatedNpub = user
    ? `${user.npub.slice(0, 8)}...${user.npub.slice(-4)}`
    : '';
  const displayLabel =
    user?.displayName || user?.name || user?.nip05 || truncatedNpub;

  return (
    <>
      {/* Desktop Controls (>= md) */}
      <div className="hidden md:flex items-center gap-3">
        <LanguageToggle currentLocale={locale} currentPath={currentPath} />

        {user ? (
          <UserMenu />
        ) : (
          <Button
            variant="default"
            size="sm"
            className="h-8 gap-1.5 text-xs font-medium shadow-xs"
            onClick={() => setAuthModalOpen(true)}
          >
            <KeyRound className="h-3.5 w-3.5 text-amber-400" />
            {t.nav.connect}
          </Button>
        )}
      </div>

      {/* Mobile Hamburger Trigger (< md) */}
      <div className="md:hidden flex items-center">
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Menüyü Kapat' : 'Menüyü Aç'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Mobile Dropdown Menu & Backdrop */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 top-16 bg-black/40 backdrop-blur-xs z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Dropdown Container */}
          <div className="absolute top-16 left-0 right-0 max-h-[calc(100vh-4rem)] overflow-y-auto bg-white border-b border-zinc-200 shadow-2xl z-50 px-4 py-4 space-y-4 md:hidden animate-in fade-in slide-in-from-top-2 duration-150">
            {/* User Profile or Connect Card */}
            {user ? (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/75 p-3.5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-amber-400 font-bold shadow-xs">
                      {user.isAdmin ? (
                        <ShieldCheck className="h-4 w-4 text-amber-500" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-zinc-900 truncate">
                        {displayLabel}
                      </div>
                      {user.nip05 && (
                        <div className="flex items-center gap-1 text-[11px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 w-fit mt-0.5">
                          <ShieldCheck className="h-3 w-3 text-amber-600 shrink-0" />
                          <span className="truncate max-w-[190px]">
                            {user.nip05}
                          </span>
                        </div>
                      )}
                      <div className="text-[11px] font-mono text-zinc-500 truncate mt-0.5">
                        {truncatedNpub}
                      </div>
                    </div>
                  </div>

                  {user.isAdmin && (
                    <Badge
                      variant="official"
                      className="text-[10px] px-1.5 py-0 h-4 shrink-0"
                    >
                      Admin
                    </Badge>
                  )}
                </div>

                <div className="pt-2 border-t border-zinc-200/60 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyNpub}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs text-zinc-700 hover:text-zinc-900 py-1.5 px-2.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 font-medium transition-colors shadow-xs cursor-pointer"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-zinc-400" />
                    )}
                    <span>{copied ? t.common.copied : t.org.copyNpub}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-1">
                <Button
                  variant="default"
                  size="default"
                  className="w-full h-10 gap-2 font-semibold shadow-xs"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setAuthModalOpen(true);
                  }}
                >
                  <KeyRound className="h-4 w-4 text-amber-400" />
                  {t.nav.connect}
                </Button>
              </div>
            )}

            {/* Navigation Links */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-1">
                {locale === 'en' ? 'Navigation' : 'Menü'}
              </span>
              <nav className="flex flex-col space-y-0.5">
                {navItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                      item.isActive
                        ? 'bg-zinc-100 text-zinc-950 font-semibold'
                        : 'text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.isActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    )}
                  </a>
                ))}
              </nav>
            </div>

            {/* Authenticated Actions */}
            {user && (
              <div className="pt-2 border-t border-zinc-100 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-1">
                  {locale === 'en' ? 'Actions' : 'İşlemler'}
                </span>
                <div className="flex flex-col space-y-1">
                  <a
                    href={getLocalizedPath('/events/create', locale)}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-amber-800 bg-amber-50/70 border border-amber-200/50 hover:bg-amber-100 transition-colors"
                  >
                    <Calendar className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>{t.nav.createEvent}</span>
                  </a>

                  {user.isAdmin && (
                    <a
                      href={getLocalizedPath('/admin', locale)}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                    >
                      <Settings className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>{t.nav.admin}</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer w-full text-left"
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    <span>{t.nav.disconnect}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Language Switcher */}
            <div className="pt-2 border-t border-zinc-100 flex items-center justify-between px-1">
              <span className="text-xs font-medium text-zinc-500">
                {locale === 'en' ? 'Language' : 'Dil Seçimi'}
              </span>
              <LanguageToggle
                currentLocale={locale}
                currentPath={currentPath}
              />
            </div>
          </div>
        </>
      )}

      {/* Shared Auth Modal */}
      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        defaultTab="extension"
      />
    </>
  );
}

export function HeaderAuthIsland({
  initialLocale,
  currentPath,
  navItems = [],
}: {
  initialLocale?: Locale;
  currentPath?: string;
  navItems?: NavItem[];
} = {}) {
  return (
    <AuthProvider>
      <I18nProvider initialLocale={initialLocale}>
        <HeaderControls currentPath={currentPath} navItems={navItems} />
      </I18nProvider>
    </AuthProvider>
  );
}

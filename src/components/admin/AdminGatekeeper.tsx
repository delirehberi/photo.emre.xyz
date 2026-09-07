/**
 * Admin Gatekeeper Component
 * photo.emre.xyz
 *
 * Enforces cryptographic access control against ADMIN_PUBKEY.
 * Renders unauthorized warning or login CTA when unauthenticated.
 */

import { useState } from 'react';
import { useAuth } from '@/lib/nostr/auth/context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, KeyRound, Lock, LogOut, Loader2 } from 'lucide-react';
import { AuthModal } from '@/components/auth/AuthModal';
import { ADMIN_PUBKEY } from '@/lib/nostr/config';
import { pubkeyToNpub } from '@/lib/nostr/keys';

export interface AdminGatekeeperProps {
  children: React.ReactNode;
}

export function AdminGatekeeper({ children }: AdminGatekeeperProps) {
  const { user, status, logout } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // 1. Loading State
  if (status === 'connecting') {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-xs">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500 mb-3" />
        <p className="text-sm font-semibold text-zinc-800">
          Kriptografik kimlik doğrulanıyor...
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          Nostr imzalayıcı durumu kontrol ediliyor
        </p>
      </div>
    );
  }

  // 2. Unauthenticated State
  if (!user) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-md">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-4">
          <Lock className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-zinc-900">Yönetici Girişi</h2>
        <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
          Yönetim paneli platform sahibine ve yetkili anahtara özeldir. NIP-07
          eklentiniz (Alby/nos2x), Bunker veya nsec anahtarınız ile bağlanın.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Button
            variant="default"
            size="default"
            className="w-full gap-2 font-semibold shadow-xs"
            onClick={() => setAuthModalOpen(true)}
          >
            <KeyRound className="h-4 w-4 text-amber-400" />
            Yönetici Anahtarıyla Bağlan
          </Button>
        </div>

        <AuthModal
          open={authModalOpen}
          onOpenChange={setAuthModalOpen}
          defaultTab="extension"
        />
      </div>
    );
  }

  // 3. Authenticated but Unauthorized State (pubkey !== ADMIN_PUBKEY)
  if (!user.isAdmin) {
    let adminNpub = '';
    try {
      adminNpub = pubkeyToNpub(ADMIN_PUBKEY);
    } catch {
      adminNpub = ADMIN_PUBKEY.slice(0, 16) + '...';
    }

    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-md">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div className="flex items-center justify-center gap-2 mb-2">
          <h2 className="text-lg font-bold text-zinc-900">
            Yetkisiz Nostr Anahtarı
          </h2>
          <Badge variant="destructive">Erişim Reddedildi</Badge>
        </div>
        <p className="text-xs text-zinc-500 leading-relaxed max-w-sm mx-auto">
          Mevcut bağlı kimliğiniz platform yönetimi için yetkilendirilmemiştir.
        </p>

        <div className="mt-5 space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-left text-xs">
          <div>
            <span className="text-[11px] text-zinc-500 block">
              Bağlı Kimliğiniz:
            </span>
            <span className="font-mono text-zinc-800 break-all">
              {user.npub}
            </span>
          </div>
          <div className="pt-2 border-t border-zinc-200">
            <span className="text-[11px] text-zinc-500 block">
              Yetkili Yönetici npub:
            </span>
            <span className="font-mono text-amber-700 break-all font-medium">
              {adminNpub}
            </span>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs text-zinc-700 border-zinc-200"
            onClick={() => setAuthModalOpen(true)}
          >
            <KeyRound className="h-3.5 w-3.5 text-zinc-500" />
            Anahtarı Değiştir
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5 text-xs text-rose-600 hover:bg-rose-50"
            onClick={logout}
          >
            <LogOut className="h-3.5 w-3.5" />
            Bağlantıyı Kes
          </Button>
        </div>

        <AuthModal
          open={authModalOpen}
          onOpenChange={setAuthModalOpen}
          defaultTab="key"
        />
      </div>
    );
  }

  // 4. Authorized Admin
  return <>{children}</>;
}

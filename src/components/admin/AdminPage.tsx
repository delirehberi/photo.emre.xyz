/**
 * Professional Admin Panel Container Component
 * photo.emre.xyz
 *
 * Provides a sleek sidebar (Left Menu) and content tabs:
 * - Dashboard (metrics & network health)
 * - Add Organisation (OrganizationCreator)
 * - Create Event Album (EventAlbumCreator)
 * - My Profile (admin npub, wallet, signer info)
 * - Settings (relays, Blossom endpoint, cache invalidation)
 */

import { useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/nostr/auth/context';
import { I18nProvider, useI18n } from '@/lib/i18n/context';
import type { Locale } from '@/lib/i18n/dictionary';
import { AdminGatekeeper } from './AdminGatekeeper';
import { OrganizationCreator } from './OrganizationCreator';
import { EventAlbumCreator } from './EventAlbumCreator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Building2,
  Calendar,
  User,
  Settings,
  Radio,
  Server,
  Image as ImageIcon,
  ShieldCheck,
  LogOut,
  Copy,
  Check,
  RefreshCw,
  PlusCircle,
  Menu,
  X,
} from 'lucide-react';
import { PRIMARY_RELAY, GLOBAL_RELAYS, ADMIN_PUBKEY } from '@/lib/nostr/config';
import { pubkeyToNpub } from '@/lib/nostr/keys';

type AdminTab =
  'dashboard' | 'add-org' | 'create-event' | 'profile' | 'settings';

function AdminDashboardContent() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copiedNpub, setCopiedNpub] = useState(false);
  const [purgingCache, setPurgingCache] = useState(false);
  const [purgeStatus, setPurgeStatus] = useState<string | null>(null);

  const adminNpub =
    user?.npub ||
    (function () {
      try {
        return pubkeyToNpub(ADMIN_PUBKEY);
      } catch {
        return ADMIN_PUBKEY;
      }
    })();

  const handleCopyNpub = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(adminNpub);
      setCopiedNpub(true);
      setTimeout(() => setCopiedNpub(false), 2000);
    }
  };

  const handlePurgeCache = async () => {
    setPurgingCache(true);
    setPurgeStatus(null);
    try {
      const res = await fetch('/api/cache/invalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pattern: '*' }),
      });
      if (res.ok) {
        setPurgeStatus('Önbellek başarıyla temizlendi.');
      } else {
        setPurgeStatus('Önbellek temizleme yanıt vermedi.');
      }
    } catch {
      setPurgeStatus('Önbellek temizlenirken hata oluştu.');
    } finally {
      setPurgingCache(false);
    }
  };

  const navItems: {
    id: AdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: 'dashboard',
      label: t.admin.menuDashboard || 'Gösterge Paneli',
      icon: LayoutDashboard,
    },
    {
      id: 'add-org',
      label: t.admin.menuAddOrg || 'Organizasyon Ekle',
      icon: Building2,
    },
    {
      id: 'create-event',
      label: t.admin.menuCreateEvent || 'Etkinlik / Albüm Oluştur',
      icon: Calendar,
    },
    { id: 'profile', label: t.admin.menuProfile || 'Profilim', icon: User },
    {
      id: 'settings',
      label: t.admin.menuSettings || 'Ayarlar',
      icon: Settings,
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-10rem)] rounded-3xl border border-zinc-200 bg-white shadow-xs overflow-hidden">
      {/* Mobile Sidebar Header */}
      <div className="lg:hidden flex items-center justify-between px-5 py-3 border-b border-zinc-200 bg-zinc-50">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-amber-400">
            <LayoutDashboard className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold text-zinc-900">
            Yönetim Menüsü
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg text-zinc-600 hover:bg-zinc-200"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Left Sidebar Menu */}
      <aside
        className={`w-full lg:w-64 shrink-0 border-r border-zinc-200 bg-zinc-50/50 flex flex-col justify-between p-4 ${
          mobileMenuOpen ? 'block' : 'hidden lg:flex'
        }`}
      >
        <div className="space-y-6">
          {/* Brand header */}
          <div className="hidden lg:flex items-center gap-3 px-2 py-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 text-amber-400 shadow-xs">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900">
                Yönetim Paneli
              </h2>
              <span className="text-[11px] text-zinc-500 font-mono">
                photo.emre.xyz
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${isActive ? 'text-amber-400' : 'text-zinc-400'}`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer User Info */}
        {user && (
          <div className="pt-4 border-t border-zinc-200 mt-6 space-y-3 px-2">
            <div className="space-y-0.5">
              <span className="text-[10px] text-zinc-400 block uppercase tracking-wider font-semibold">
                Yönetici Kimliği
              </span>
              <span className="font-mono text-xs text-zinc-700 block truncate">
                {adminNpub.slice(0, 10)}...{adminNpub.slice(-4)}
              </span>
            </div>

            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-rose-600 hover:bg-rose-50 transition cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Çıkış Yap</span>
            </button>
          </div>
        )}
      </aside>

      {/* Content Area */}
      <main className="flex-1 p-6 sm:p-8 lg:p-10 overflow-y-auto bg-white">
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
                Sistem ve Platform Göstergesi
              </h1>
              <p className="text-xs text-zinc-500 mt-1">
                photo.emre.xyz ağ düğümleri, röle senkronizasyonu ve etkinlik
                metrikleri.
              </p>
            </div>

            {/* Metric Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-5 space-y-2">
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="text-xs font-medium">Organizasyonlar</span>
                  <Building2 className="h-4 w-4 text-amber-600" />
                </div>
                <div className="text-2xl font-extrabold text-zinc-900">3</div>
                <p className="text-[11px] text-zinc-500">
                  Kayıtlı Nostr profili
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-5 space-y-2">
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="text-xs font-medium">
                    Etkinlik Albümleri
                  </span>
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-2xl font-extrabold text-zinc-900">12</div>
                <p className="text-[11px] text-zinc-500">
                  Kind 31922 etkinliği
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-5 space-y-2">
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="text-xs font-medium">
                    Fotoğraf Varlıkları
                  </span>
                  <ImageIcon className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-2xl font-extrabold text-zinc-900">256</div>
                <p className="text-[11px] text-zinc-500">NIP-94 içerik kaydı</p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-5 space-y-2">
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="text-xs font-medium">Blossom Depolama</span>
                  <Server className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-extrabold text-zinc-900">
                  1.2 GB
                </div>
                <p className="text-[11px] text-zinc-500">SHA-256 medya blobu</p>
              </div>
            </div>

            {/* Network Health: Relay Mesh & Media Server */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Relays */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                    <Radio className="h-4 w-4 text-amber-600" />
                    Röle Ağı Durumu
                  </h3>
                  <Badge variant="official" className="text-[10px]">
                    4 Aktif Röle
                  </Badge>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Primary Relay */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/50 border border-amber-200/60">
                    <div>
                      <span className="font-semibold text-zinc-900 block">
                        {PRIMARY_RELAY}
                      </span>
                      <span className="text-[10px] text-amber-800">
                        Ana Çapa Rölesi (Yazma Korumalı)
                      </span>
                    </div>
                    <Badge
                      variant="official"
                      className="text-[10px] px-1.5 py-0.5"
                    >
                      Çevrim İçi &bull; 18ms
                    </Badge>
                  </div>

                  {/* Federated Relays */}
                  {GLOBAL_RELAYS.map((relay) => (
                    <div
                      key={relay}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 border border-zinc-100"
                    >
                      <div>
                        <span className="font-medium text-zinc-800 block">
                          {relay}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          Genel Açık Röle
                        </span>
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0.5 text-zinc-600"
                      >
                        Aktif
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Blossom Media Health & Quick Actions */}
              <div className="space-y-6">
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3 shadow-xs">
                  <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                    <Server className="h-4 w-4 text-emerald-600" />
                    Blossom Medya Sunucusu
                  </h3>
                  <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Uç Nokta:</span>
                      <code className="font-mono text-zinc-900">
                        https://media.emre.xyz
                      </code>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Yetkilendirme:</span>
                      <span className="text-zinc-800 font-medium">
                        NIP-98 HTTP Auth
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Sağlık:</span>
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <Check className="h-3 w-3" /> Aktif
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3 shadow-xs">
                  <h3 className="text-sm font-bold text-zinc-900">
                    Hızlı İşlemler
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setActiveTab('create-event')}
                      className="text-xs gap-1.5 font-medium"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      Etkinlik Aç
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('add-org')}
                      className="text-xs gap-1.5 border-zinc-200"
                    >
                      <Building2 className="h-3.5 w-3.5 text-zinc-600" />
                      Org Ekle
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ADD ORGANISATION */}
        {activeTab === 'add-org' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
                Organizasyon Ekle
              </h1>
              <p className="text-xs text-zinc-500 mt-1">
                Topluluğunuz için Nostr üzerinde açık Kind 0 profili yayınlayın.
              </p>
            </div>
            <OrganizationCreator />
          </div>
        )}

        {/* TAB 3: CREATE EVENT / ALBUM */}
        {activeTab === 'create-event' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
                Etkinlik / Albüm Oluştur
              </h1>
              <p className="text-xs text-zinc-500 mt-1">
                'event-album' etiketli yeni bir Kind 31922 etkinlik takvim
                albümü yayınlayın.
              </p>
            </div>
            <EventAlbumCreator />
          </div>
        )}

        {/* TAB 4: MY PROFILE */}
        {activeTab === 'profile' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
                Yönetici Profili
              </h1>
              <p className="text-xs text-zinc-500 mt-1">
                Bağlı Nostr kimliğiniz ve yönetim yetkileriniz.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-4 text-xs">
              <div className="space-y-1">
                <span className="text-zinc-500 font-medium block">
                  Nostr npub:
                </span>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-50 border border-zinc-200">
                  <span className="font-mono text-zinc-800 break-all flex-1 select-all">
                    {adminNpub}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyNpub}
                    className="h-7 text-xs gap-1 border-zinc-200 shrink-0"
                  >
                    {copiedNpub ? (
                      <Check className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    <span>{copiedNpub ? 'Kopyalandı' : 'Kopyala'}</span>
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-zinc-500 font-medium block">
                  Hex Pubkey:
                </span>
                <div className="p-2 rounded-lg bg-zinc-50 border border-zinc-200 font-mono text-zinc-700 break-all">
                  {user?.pubkey || ADMIN_PUBKEY}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
                  <span className="text-zinc-400 block text-[11px]">
                    İmzalayıcı Türü
                  </span>
                  <span className="font-semibold text-zinc-900 capitalize">
                    {user?.type || 'NIP-07'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
                  <span className="text-zinc-400 block text-[11px]">
                    Yönetici Muafiyeti
                  </span>
                  <span className="font-semibold text-emerald-600">
                    Aktif (0 sats ücret)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
                Platform Ayarları
              </h1>
              <p className="text-xs text-zinc-500 mt-1">
                Röle yapılandırması, Blossom sunucusu ve kenar önbellek
                yönetimi.
              </p>
            </div>

            {/* Cache Invalidation */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-4 text-xs">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">
                  Cloudflare Kenar Önbelleği (SWR)
                </h3>
                <p className="text-zinc-500 mt-0.5">
                  Albüm ve fotoğraf sayfaları kenar ağında önbelleğe alınır.
                  Yeni güncellemeleri anında dağıtmak için önbelleği temizleyin.
                </p>
              </div>

              {purgeStatus && (
                <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800">
                  {purgeStatus}
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handlePurgeCache}
                disabled={purgingCache}
                className="gap-2 border-zinc-200"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${purgingCache ? 'animate-spin' : ''}`}
                />
                {purgingCache ? 'Temizleniyor...' : 'Önbelleği Temizle'}
              </Button>
            </div>

            {/* Relay Info */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-3 text-xs">
              <h3 className="text-sm font-bold text-zinc-900">Röle Mimarisi</h3>
              <p className="text-zinc-500 leading-relaxed">
                <code className="font-semibold text-zinc-800">
                  {PRIMARY_RELAY}
                </code>{' '}
                çapa rölesi yönetici anahtarına özel korumalıdır. Topluluk
                organizatörleri ise genel açık federasyon rölelerine (Damus,
                Primal, Nos.lol) doğrudan yazmaktadır.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export function AdminPage({
  initialLocale,
}: {
  initialLocale?: Locale;
} = {}) {
  return (
    <AuthProvider>
      <I18nProvider initialLocale={initialLocale}>
        <div className="container mx-auto py-8 sm:py-12 px-4 sm:px-6 max-w-7xl">
          <AdminGatekeeper>
            <AdminDashboardContent />
          </AdminGatekeeper>
        </div>
      </I18nProvider>
    </AuthProvider>
  );
}

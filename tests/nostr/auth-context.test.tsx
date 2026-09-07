import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  useAuth,
  AuthProvider,
  DEFAULT_AUTH_CONTEXT,
  AUTH_CHANGE_EVENT,
} from '../../src/lib/nostr/auth/context';
import type { AuthContextValue } from '../../src/lib/nostr/auth/types';
import { DualSectionGallery } from '../../src/components/gallery/DualSectionGallery';
import { HeaderAuthIsland } from '../../src/components/auth/HeaderAuthIsland';
import type { EventAlbum, PhotoMetadata } from '../../src/lib/nostr/types';

describe('Auth Context & SSR Resilience', () => {
  it('defines safe default unauthenticated context values', () => {
    expect(DEFAULT_AUTH_CONTEXT.user).toBeNull();
    expect(DEFAULT_AUTH_CONTEXT.signer).toBeNull();
    expect(DEFAULT_AUTH_CONTEXT.status).toBe('idle');
    expect(DEFAULT_AUTH_CONTEXT.error).toBeNull();
    expect(typeof DEFAULT_AUTH_CONTEXT.loginWithNip07).toBe('function');
    expect(typeof DEFAULT_AUTH_CONTEXT.logout).toBe('function');
  });

  it('renders a component using useAuth without AuthProvider and does not throw', () => {
    let capturedAuth: AuthContextValue | undefined;

    function Consumer() {
      capturedAuth = useAuth();
      return <div>Status: {capturedAuth.status}</div>;
    }

    const html = renderToString(<Consumer />);
    expect(html).toContain('idle');
    expect(capturedAuth).toBeDefined();
    if (capturedAuth) {
      expect(capturedAuth.user).toBeNull();
      expect(capturedAuth.status).toBe('idle');
    }
  });

  it('renders a component within AuthProvider correctly during SSR', () => {
    let capturedAuth: AuthContextValue | undefined;

    function Consumer() {
      capturedAuth = useAuth();
      return <div data-testid="status">{capturedAuth.status}</div>;
    }

    const html = renderToString(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    expect(html).toContain('idle');
    expect(capturedAuth).toBeDefined();
    if (capturedAuth) {
      expect(capturedAuth.user).toBeNull();
    }
  });

  it('renders DualSectionGallery during SSR without external AuthProvider and does not throw', () => {
    const mockAlbum: EventAlbum = {
      id: 'album-event-id-123',
      coordinate: '31922:testpubkey:test-album',
      pubkey: 'testpubkey123',
      dTag: 'test-album',
      title: 'Istanbul Nostr Hackathon 2026',
      summary: 'A wonderful weekend of open source and decentralization',
      tags: ['hackathon', 'nostr'],
      coverImage: 'https://example.com/cover.jpg',
      startDate: 1770000000,
      createdAt: 1770000000,
    };

    const mockPhotos: PhotoMetadata[] = [
      {
        id: 'photo-1',
        pubkey: 'testpubkey123',
        url: 'https://example.com/photo1.jpg',
        sha256: 'a'.repeat(64),
        mimeType: 'image/jpeg',
        albumCoordinate: '31922:testpubkey:test-album',
        dimensions: { width: 1920, height: 1080, aspectRatio: 1.7778 },
        createdAt: 1770000100,
      },
    ];

    expect(() => {
      const html = renderToString(
        <DualSectionGallery
          album={mockAlbum}
          officialPhotos={mockPhotos}
          communityPhotos={[]}
        />,
      );
      expect(html).toContain('Istanbul Nostr Hackathon 2026');
    }).not.toThrow();
  });

  it('renders HeaderAuthIsland in SSR with nav items and does not throw', () => {
    const navItems = [
      { href: '/', label: 'Ana Sayfa', isActive: true },
      { href: '/events', label: 'Etkinlikler', isActive: false },
    ];

    expect(() => {
      const html = renderToString(
        <HeaderAuthIsland
          initialLocale="tr"
          currentPath="/"
          navItems={navItems}
        />,
      );
      expect(html).toBeDefined();
    }).not.toThrow();
  });

  it('exports AUTH_CHANGE_EVENT for cross-island sync', () => {
    expect(AUTH_CHANGE_EVENT).toBe('photo:auth:change');
  });
});

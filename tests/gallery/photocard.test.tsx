import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { PhotoCard } from '../../src/components/gallery/PhotoCard';
import type { PhotoMetadata } from '../../src/lib/nostr/types';

const mockPhoto: PhotoMetadata = {
  id: 'test-photo-1',
  pubkey: '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245',
  url: 'https://media.emre.xyz/2026/09/87ef19d0c10070c012a4a11383753741d6c90c448ae2cdcdf78c18e3df12fe33.jpg',
  sha256: '87ef19d0c10070c012a4a11383753741d6c90c448ae2cdcdf78c18e3df12fe33',
  mimeType: 'image/jpeg',
  dimensions: {
    width: 900,
    height: 1600,
    aspectRatio: 0.5625,
  },
  albumCoordinate:
    '31922:32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245:event-1',
  alt: 'WhatsApp Image 2026-09-07 at 13.09.42.jpeg',
  summary: 'Event photo',
  createdAt: 1788809320,
};

describe('PhotoCard Component', () => {
  it('renders during SSR with proper placeholder and img tags', () => {
    const html = renderToString(<PhotoCard photo={mockPhoto} />);

    // Should include the transformed thumbnail image src
    expect(html).toContain(
      'https://media.emre.xyz/2026/09/87ef19d0c10070c012a4a11383753741d6c90c448ae2cdcdf78c18e3df12fe33.jpg?thumbnail=true',
    );
    // Should include alt text
    expect(html).toContain('WhatsApp Image 2026-09-07 at 13.09.42.jpeg');
    // Should render the aspect ratio style
    expect(html).toContain('aspect-ratio:0.5625');
    // Should render dimensions in placeholder
    expect(html).toContain('900');
    expect(html).toContain('1600');
  });

  it('renders error fallback state when forceErrorState is true', () => {
    const html = renderToString(
      <PhotoCard photo={mockPhoto} forceErrorState={true} />,
    );

    expect(html).toContain('Görsel Yüklenemedi');
    expect(html).toContain('Tekrar Dene');
    // img tag should not be rendered in error state
    expect(html).not.toContain('<img');
  });

  it('renders loading state when forceLoadingState is true', () => {
    const html = renderToString(
      <PhotoCard photo={mockPhoto} forceLoadingState={true} />,
    );

    expect(html).toContain('Loading photo');
    expect(html).toContain('opacity-0');
  });

  it('renders community badge when isCommunity is true', () => {
    const html = renderToString(
      <PhotoCard photo={mockPhoto} isCommunity={true} />,
    );

    expect(html).toContain('Topluluk');
  });
});

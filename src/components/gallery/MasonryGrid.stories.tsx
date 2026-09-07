import type { Meta, StoryObj } from '@storybook/react';
import { MasonryGrid } from './MasonryGrid';
import type { PhotoMetadata } from '@/lib/nostr/types';

const mockPhotos: PhotoMetadata[] = [
  {
    id: 'photo-1',
    pubkey: '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245',
    url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    mimeType: 'image/jpeg',
    dimensions: { width: 1200, height: 800, aspectRatio: 1.5 },
    albumCoordinate:
      '31922:32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245:berlin',
    summary: 'Vintage 35mm rangefinder camera',
    createdAt: 1700000000,
  },
  {
    id: 'photo-2',
    pubkey: '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245',
    url: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=800&q=80',
    sha256: 'a3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b866',
    mimeType: 'image/jpeg',
    dimensions: { width: 800, height: 1200, aspectRatio: 0.6667 },
    albumCoordinate:
      '31922:32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245:berlin',
    summary: 'Portrait of street photographer',
    createdAt: 1700000100,
  },
  {
    id: 'photo-3',
    pubkey: '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245',
    url: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80',
    sha256: 'b3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b877',
    mimeType: 'image/jpeg',
    dimensions: { width: 1000, height: 1000, aspectRatio: 1 },
    albumCoordinate:
      '31922:32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245:berlin',
    summary: 'Architecture square format',
    createdAt: 1700000200,
  },
  {
    id: 'photo-4',
    pubkey: '1111111111111111111111111111111111111111111111111111111111111111',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
    sha256: 'c3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b888',
    mimeType: 'image/jpeg',
    dimensions: { width: 1600, height: 900, aspectRatio: 1.7778 },
    albumCoordinate:
      '31922:32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245:berlin',
    summary: 'Mountain landscape attendee photo',
    createdAt: 1700000300,
  },
];

const meta: Meta<typeof MasonryGrid> = {
  title: 'Gallery/MasonryGrid',
  component: MasonryGrid,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof MasonryGrid>;

export const Responsive4Columns: Story = {
  args: {
    photos: mockPhotos,
    columns: 4,
    organizerPubkey:
      '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245',
  },
};

export const Responsive3Columns: Story = {
  args: {
    photos: mockPhotos,
    columns: 3,
    organizerPubkey:
      '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245',
  },
};

export const Responsive2Columns: Story = {
  args: {
    photos: mockPhotos,
    columns: 2,
    organizerPubkey:
      '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245',
  },
};

export const Responsive1Column: Story = {
  args: {
    photos: mockPhotos,
    columns: 1,
    organizerPubkey:
      '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245',
  },
};

export const EmptyState: Story = {
  args: {
    photos: [],
    emptyTitle: 'No photos in this section',
    emptyDescription: 'Be the first to submit photos to this gallery!',
  },
};

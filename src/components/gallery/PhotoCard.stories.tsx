import type { Meta, StoryObj } from '@storybook/react';
import { PhotoCard } from './PhotoCard';
import type { PhotoMetadata } from '@/lib/nostr/types';

const mockPhoto: PhotoMetadata = {
  id: 'photo-mock-1',
  pubkey: '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245',
  url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80',
  sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  mimeType: 'image/jpeg',
  dimensions: {
    width: 1200,
    height: 800,
    aspectRatio: 1.5,
  },
  albumCoordinate:
    '31922:32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245:berlin-2026',
  alt: 'Vintage 35mm Camera on wooden table',
  summary: 'Opening keynote session photography',
  exif: {
    make: 'Sony',
    model: 'ILCE-7M4',
    lens: 'FE 24-70mm F2.8 GM II',
    aperture: 'f/2.8',
    shutterSpeed: '1/500s',
    iso: 100,
    focalLength: '35mm',
  },
  createdAt: 1700000000,
};

const meta: Meta<typeof PhotoCard> = {
  title: 'Gallery/PhotoCard',
  component: PhotoCard,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[360px] p-4 bg-zinc-950">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PhotoCard>;

export const Default: Story = {
  args: {
    photo: mockPhoto,
    isCommunity: false,
  },
};

export const LoadingSkeleton: Story = {
  args: {
    photo: mockPhoto,
    isCommunity: false,
    forceLoadingState: true,
  },
};

export const ErrorState: Story = {
  args: {
    photo: {
      ...mockPhoto,
      url: 'https://invalid-host.emre.xyz/nonexistent.jpg',
    },
    isCommunity: false,
    forceErrorState: true,
  },
};

export const CommunityBadge: Story = {
  args: {
    photo: {
      ...mockPhoto,
      summary: 'Attendee candid portrait from crowd',
    },
    isCommunity: true,
  },
};

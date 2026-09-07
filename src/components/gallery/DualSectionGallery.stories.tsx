import type { Meta, StoryObj } from '@storybook/react';
import { DualSectionGallery } from './DualSectionGallery';
import { AuthProvider } from '@/lib/nostr/auth/context';
import type {
  EventAlbum,
  PhotoMetadata,
  OrganizationProfile,
} from '@/lib/nostr/types';

const mockOrganizer: OrganizationProfile = {
  pubkey: '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245',
  name: 'emre',
  displayName: 'Emre Yılmaz',
  about: 'Nostr engineer & event photographer',
  picture:
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  nip05: 'emre@emre.xyz',
  createdAt: 1700000000,
};

const mockAlbum: EventAlbum = {
  id: 'album-1',
  pubkey: '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245',
  dTag: 'berlin-hackathon-2026',
  title: 'Nostr Berlin Hackathon 2026',
  summary:
    'Three days of decentralized building, Lightning integration, and privacy tech workshops in Berlin Kreuzberg.',
  startDate: 1773000000,
  endDate: 1773260000,
  location: 'Berlin, Germany',
  tags: ['nostr', 'hackathon', 'bitcoin', 'berlin'],
  coordinate:
    '31922:32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245:berlin-hackathon-2026',
  createdAt: 1700000000,
};

const mockOfficialPhotos: PhotoMetadata[] = [
  {
    id: 'p-1',
    pubkey: '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245',
    url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80',
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    mimeType: 'image/jpeg',
    dimensions: { width: 1200, height: 800, aspectRatio: 1.5 },
    albumCoordinate: mockAlbum.coordinate,
    summary: 'Opening keynote by conference host',
    createdAt: 1700000100,
    exif: {
      make: 'Sony',
      model: 'ILCE-7M4',
      lens: 'FE 24-70mm F2.8 GM II',
      aperture: 'f/2.8',
      shutterSpeed: '1/500s',
      iso: 100,
      focalLength: '35mm',
    },
  },
  {
    id: 'p-2',
    pubkey: '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245',
    url: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=1200&q=80',
    sha256: 'a3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b866',
    mimeType: 'image/jpeg',
    dimensions: { width: 900, height: 1200, aspectRatio: 0.75 },
    albumCoordinate: mockAlbum.coordinate,
    summary: 'Coding session deep in the development lab',
    createdAt: 1700000200,
  },
];

const mockCommunityPhotos: PhotoMetadata[] = [
  {
    id: 'p-3',
    pubkey: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    sha256: 'b3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b877',
    mimeType: 'image/jpeg',
    dimensions: { width: 1600, height: 900, aspectRatio: 1.7778 },
    albumCoordinate: mockAlbum.coordinate,
    summary: 'Attendee sunset view from rooftop lounge',
    createdAt: 1700000300,
  },
];

const meta: Meta<typeof DualSectionGallery> = {
  title: 'Gallery/DualSectionGallery',
  component: DualSectionGallery,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <AuthProvider>
        <div className="max-w-6xl mx-auto p-4 sm:p-6 bg-zinc-950 min-h-screen">
          <Story />
        </div>
      </AuthProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DualSectionGallery>;

export const StandardAlbum: Story = {
  args: {
    album: mockAlbum,
    officialPhotos: mockOfficialPhotos,
    communityPhotos: mockCommunityPhotos,
    organizerProfile: mockOrganizer,
  },
};

export const OfficialOnly: Story = {
  args: {
    album: mockAlbum,
    officialPhotos: mockOfficialPhotos,
    communityPhotos: [],
    organizerProfile: mockOrganizer,
  },
};

export const EmptyAlbum: Story = {
  args: {
    album: mockAlbum,
    officialPhotos: [],
    communityPhotos: [],
    organizerProfile: mockOrganizer,
  },
};

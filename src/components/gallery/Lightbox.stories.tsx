import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Lightbox } from './Lightbox';
import { Button } from '@/components/ui/button';
import type { PhotoMetadata } from '@/lib/nostr/types';

const mockPhotos: PhotoMetadata[] = [
  {
    id: 'photo-1',
    pubkey: '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245',
    url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1600&q=80',
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    mimeType: 'image/jpeg',
    dimensions: { width: 1600, height: 1067, aspectRatio: 1.5 },
    albumCoordinate:
      '31922:32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245:berlin-2026',
    alt: 'Vintage Camera',
    summary: 'Opening keynote session presentation camera gear',
    exif: {
      make: 'Sony',
      model: 'ILCE-7M4',
      lens: 'FE 24-70mm F2.8 GM II',
      aperture: 'f/2.8',
      shutterSpeed: '1/500s',
      iso: 100,
      focalLength: '35mm',
      dateTimeOriginal: '2026:09:06 14:30:00',
    },
    createdAt: 1700000000,
  },
  {
    id: 'photo-2',
    pubkey: '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245',
    url: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=1600&q=80',
    sha256: 'a3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b866',
    mimeType: 'image/jpeg',
    dimensions: { width: 1200, height: 1600, aspectRatio: 0.75 },
    albumCoordinate:
      '31922:32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245:berlin-2026',
    alt: 'Street Photography in Berlin',
    summary: 'Portrait of attendee photographer with analog camera',
    exif: {
      make: 'Leica',
      model: 'Leica M11',
      lens: 'Summilux-M 35mm f/1.4 ASPH',
      aperture: 'f/1.4',
      shutterSpeed: '1/1000s',
      iso: 64,
      focalLength: '35mm',
    },
    createdAt: 1700000100,
  },
  {
    id: 'photo-3',
    pubkey: '1111111111111111111111111111111111111111111111111111111111111111',
    url: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1600&q=80',
    sha256: 'b3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b877',
    mimeType: 'image/jpeg',
    dimensions: { width: 1400, height: 1400, aspectRatio: 1 },
    albumCoordinate:
      '31922:32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245:berlin-2026',
    alt: 'Architecture facade',
    summary: 'Venue exterior architecture in Berlin Mitte',
    createdAt: 1700000200,
  },
];

const meta: Meta<typeof Lightbox> = {
  title: 'Gallery/Lightbox',
  component: Lightbox,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Lightbox>;

export const SingleView: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <div className="p-8 text-center">
        <Button onClick={() => setOpen(true)}>
          Open Single Photo Lightbox
        </Button>
        <Lightbox
          photos={[mockPhotos[0]]}
          activePhoto={mockPhotos[0]}
          open={open}
          onOpenChange={setOpen}
          albumTitle="Berlin Hackathon 2026"
        />
      </div>
    );
  },
};

export const MultiViewWithNavigation: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <div className="p-8 text-center">
        <Button onClick={() => setOpen(true)}>Open Multi-Photo Gallery</Button>
        <Lightbox
          photos={mockPhotos}
          activePhoto={mockPhotos[0]}
          open={open}
          onOpenChange={setOpen}
          organizerPubkey="32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245"
          albumTitle="Berlin Hackathon 2026"
        />
      </div>
    );
  },
};

export const ExifDrawerOpen: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <div className="p-8 text-center">
        <Button onClick={() => setOpen(true)}>Open Lightbox with EXIF</Button>
        <Lightbox
          photos={mockPhotos}
          activePhoto={mockPhotos[0]}
          open={open}
          onOpenChange={setOpen}
          organizerPubkey="32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245"
          albumTitle="Berlin Hackathon 2026"
          defaultExifOpen={true}
        />
      </div>
    );
  },
};

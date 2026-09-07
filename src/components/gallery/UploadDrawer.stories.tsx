import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { UploadDrawer, type QueueItem } from './UploadDrawer';
import { Button } from '@/components/ui/button';
import { AuthProvider } from '@/lib/nostr/auth/context';
import { UploadCloud } from 'lucide-react';

const mockQueuedItems: QueueItem[] = [
  {
    id: 'queue-1',
    file: new File(['mock'], 'opening-keynote.jpg', { type: 'image/jpeg' }),
    fileName: 'opening-keynote.jpg',
    fileSize: 4200000,
    thumbnailUrl: '',
    dimensions: { width: 4000, height: 2667 },
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    status: 'idle',
    progress: 0,
  },
  {
    id: 'queue-2',
    file: new File(['mock'], 'audience-applause.jpg', { type: 'image/jpeg' }),
    fileName: 'audience-applause.jpg',
    fileSize: 3100000,
    thumbnailUrl: '',
    dimensions: { width: 3840, height: 2160 },
    sha256: 'a3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b866',
    status: 'idle',
    progress: 0,
  },
];

const mockUploadingItems: QueueItem[] = [
  {
    id: 'queue-1',
    file: new File(['mock'], 'opening-keynote.jpg', { type: 'image/jpeg' }),
    fileName: 'opening-keynote.jpg',
    fileSize: 4200000,
    thumbnailUrl: '',
    dimensions: { width: 4000, height: 2667 },
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    status: 'uploading',
    progress: 68,
  },
  {
    id: 'queue-2',
    file: new File(['mock'], 'audience-applause.jpg', { type: 'image/jpeg' }),
    fileName: 'audience-applause.jpg',
    fileSize: 3100000,
    thumbnailUrl: '',
    dimensions: { width: 3840, height: 2160 },
    sha256: 'a3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b866',
    status: 'completed',
    progress: 100,
  },
];

const meta: Meta<typeof UploadDrawer> = {
  title: 'Gallery/UploadDrawer',
  component: UploadDrawer,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <AuthProvider>
        <Story />
      </AuthProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof UploadDrawer>;

export const EmptyDropzone: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <div className="p-8 text-center">
        <Button onClick={() => setOpen(true)}>
          <UploadCloud className="w-4 h-4 mr-2" />
          Open Upload Drawer (Empty)
        </Button>
        <UploadDrawer
          albumCoordinate="31922:32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245:berlin-2026"
          organizerPubkey="32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245"
          albumTitle="Berlin Hackathon 2026"
          open={open}
          onOpenChange={setOpen}
        />
      </div>
    );
  },
};

export const FilesQueued: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <div className="p-8 text-center">
        <Button onClick={() => setOpen(true)}>
          <UploadCloud className="w-4 h-4 mr-2" />
          Open Drawer (2 Files Queued)
        </Button>
        <UploadDrawer
          albumCoordinate="31922:32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245:berlin-2026"
          organizerPubkey="32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245"
          albumTitle="Berlin Hackathon 2026"
          open={open}
          onOpenChange={setOpen}
          initialQueue={mockQueuedItems}
        />
      </div>
    );
  },
};

export const UploadingProgress: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <div className="p-8 text-center">
        <Button onClick={() => setOpen(true)}>
          <UploadCloud className="w-4 h-4 mr-2" />
          Open Drawer (Uploading Active)
        </Button>
        <UploadDrawer
          albumCoordinate="31922:32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245:berlin-2026"
          organizerPubkey="32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245"
          albumTitle="Berlin Hackathon 2026"
          open={open}
          onOpenChange={setOpen}
          initialQueue={mockUploadingItems}
        />
      </div>
    );
  },
};

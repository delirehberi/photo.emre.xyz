import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { LightningPaymentModal } from './LightningPaymentModal';
import { Button } from '@/components/ui/button';
import { AuthProvider } from '@/lib/nostr/auth/context';

const meta: Meta<typeof LightningPaymentModal> = {
  title: 'Lightning/LightningPaymentModal',
  component: LightningPaymentModal,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <AuthProvider>
        <div className="p-6">
          <Story />
        </div>
      </AuthProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LightningPaymentModal>;

export const CreateOrganizationRate: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <div>
        <Button onClick={() => setOpen(true)}>
          Open Payment Modal (100 Sats)
        </Button>
        <LightningPaymentModal
          open={open}
          onOpenChange={setOpen}
          action="create_organization"
          onSettled={(proof) => {
            console.log('Payment settled:', proof);
            setOpen(false);
          }}
        />
      </div>
    );
  },
};

export const CreateAlbumRate: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <div>
        <Button onClick={() => setOpen(true)}>
          Open Payment Modal (100 Sats)
        </Button>
        <LightningPaymentModal
          open={open}
          onOpenChange={setOpen}
          action="create_album"
          onSettled={(proof) => {
            console.log('Payment settled:', proof);
            setOpen(false);
          }}
        />
      </div>
    );
  },
};

export const UploadImagesRate: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <div>
        <Button onClick={() => setOpen(true)}>
          Open Upload Modal (3 Images - 63 Sats)
        </Button>
        <LightningPaymentModal
          open={open}
          onOpenChange={setOpen}
          action="upload_image"
          count={3}
          onSettled={(proof) => {
            console.log('Payment settled:', proof);
            setOpen(false);
          }}
        />
      </div>
    );
  },
};

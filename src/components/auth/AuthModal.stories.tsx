import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { AuthModal } from './AuthModal';
import { Button } from '@/components/ui/button';
import { AuthProvider } from '@/lib/nostr/auth/context';

const meta: Meta<typeof AuthModal> = {
  title: 'Auth/AuthModal',
  component: AuthModal,
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
type Story = StoryObj<typeof AuthModal>;

export const ExtensionTab: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <div>
        <Button onClick={() => setOpen(true)}>Open Auth Modal</Button>
        <AuthModal open={open} onOpenChange={setOpen} defaultTab="extension" />
      </div>
    );
  },
};

export const BunkerTab: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <div>
        <Button onClick={() => setOpen(true)}>Open Bunker Modal</Button>
        <AuthModal open={open} onOpenChange={setOpen} defaultTab="bunker" />
      </div>
    );
  },
};

export const KeypairTab: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <div>
        <Button onClick={() => setOpen(true)}>Open Keypair Modal</Button>
        <AuthModal open={open} onOpenChange={setOpen} defaultTab="key" />
      </div>
    );
  },
};

export const ReadOnlyTab: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <div>
        <Button onClick={() => setOpen(true)}>Open Read-Only Modal</Button>
        <AuthModal open={open} onOpenChange={setOpen} defaultTab="readonly" />
      </div>
    );
  },
};

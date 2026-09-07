import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { KeypairRevealModal } from './KeypairRevealModal';
import { Button } from '@/components/ui/button';
import type { NostrKeypair } from '@/lib/nostr/keys';

const mockKeypair: NostrKeypair = {
  secretKey: new Uint8Array(32).fill(7),
  hexSecretKey:
    '0707070707070707070707070707070707070707070707070707070707070707',
  nsec: 'nsec10qv40qv40qv40qv40qv40qv40qv40qv40qv40qv40qv40qv40qv4sp4j4d',
  pubkey: '46f3c7bb33cc3019049b76dc89dbb96e34c247bdda68b6ad8632682793ff8a1a',
  npub: 'npub1j28u679s74svlcz8vsvw5h596562gupvdhcz3v3l6s0p37m29r2q983d3j',
};

const meta: Meta<typeof KeypairRevealModal> = {
  title: 'Auth/KeypairRevealModal',
  component: KeypairRevealModal,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof KeypairRevealModal>;

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <div className="p-6">
        <Button onClick={() => setOpen(true)}>Open Keypair Modal</Button>
        <KeypairRevealModal
          open={open}
          onOpenChange={setOpen}
          keypair={mockKeypair}
          onConfirm={(kp) => console.log('Confirmed keypair:', kp.npub)}
        />
      </div>
    );
  },
};

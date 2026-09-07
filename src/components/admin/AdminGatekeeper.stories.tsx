import type { Meta, StoryObj } from '@storybook/react';
import { AdminGatekeeper } from './AdminGatekeeper';
import { AuthProvider } from '@/lib/nostr/auth/context';

const meta: Meta<typeof AdminGatekeeper> = {
  title: 'Admin/AdminGatekeeper',
  component: AdminGatekeeper,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <AuthProvider>
        <div className="p-8 bg-zinc-950 min-h-[400px]">
          <Story />
        </div>
      </AuthProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AdminGatekeeper>;

export const DefaultGatekeeper: Story = {
  render: () => (
    <AdminGatekeeper>
      <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/20 p-6 text-center text-emerald-300">
        <h3 className="text-base font-bold">Authorized Admin Area</h3>
        <p className="text-xs text-emerald-400/80 mt-1">
          This content is only visible to the verified administrator public key.
        </p>
      </div>
    </AdminGatekeeper>
  ),
};

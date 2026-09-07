import type { Meta, StoryObj } from '@storybook/react';
import { UserMenu } from './UserMenu';
import { AuthProvider } from '@/lib/nostr/auth/context';

const meta: Meta<typeof UserMenu> = {
  title: 'Auth/UserMenu',
  component: UserMenu,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <AuthProvider>
        <div className="p-8 flex justify-end bg-zinc-950 min-h-[150px]">
          <Story />
        </div>
      </AuthProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof UserMenu>;

export const Default: Story = {
  render: () => <UserMenu />,
};

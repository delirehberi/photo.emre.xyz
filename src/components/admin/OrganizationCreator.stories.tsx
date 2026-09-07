import type { Meta, StoryObj } from '@storybook/react';
import { OrganizationCreator } from './OrganizationCreator';
import { AuthProvider } from '@/lib/nostr/auth/context';

const meta: Meta<typeof OrganizationCreator> = {
  title: 'Admin/OrganizationCreator',
  component: OrganizationCreator,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <AuthProvider>
        <div className="p-8 bg-zinc-950 min-h-[600px]">
          <Story />
        </div>
      </AuthProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof OrganizationCreator>;

export const Default: Story = {
  render: () => <OrganizationCreator />,
};

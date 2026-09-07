import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './badge';
import { ShieldCheck, Users } from 'lucide-react';

const meta: Meta<typeof Badge> = {
  title: 'Primitives/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'secondary',
        'destructive',
        'outline',
        'official',
        'community',
      ],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {
    children: 'Badge',
    variant: 'default',
  },
};

export const OfficialGallery: Story = {
  render: () => (
    <Badge variant="official">
      <ShieldCheck className="w-3.5 h-3.5" />
      Official Gallery
    </Badge>
  ),
};

export const CommunityUpload: Story = {
  render: () => (
    <Badge variant="community">
      <Users className="w-3.5 h-3.5" />
      Community
    </Badge>
  ),
};

export const Outline: Story = {
  args: {
    children: 'RAW / 48MP',
    variant: 'outline',
  },
};

import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';
import { Loader2, ArrowRight } from 'lucide-react';

const meta: Meta<typeof Button> = {
  title: 'Primitives/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'destructive',
        'outline',
        'secondary',
        'ghost',
        'link',
      ],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
    disabled: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: 'Explore Gallery',
    variant: 'default',
    size: 'default',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary Action',
    variant: 'secondary',
  },
};

export const Outline: Story = {
  args: {
    children: 'Outline Action',
    variant: 'outline',
  },
};

export const Ghost: Story = {
  args: {
    children: 'Ghost Action',
    variant: 'ghost',
  },
};

export const Destructive: Story = {
  args: {
    children: 'Delete Photo',
    variant: 'destructive',
  },
};

export const Loading: Story = {
  render: () => (
    <Button disabled variant="secondary">
      <Loader2 className="animate-spin" />
      Syncing Relays...
    </Button>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <Button variant="default">
      Connect Bunker
      <ArrowRight />
    </Button>
  ),
};

export const IconOnly: Story = {
  args: {
    size: 'icon',
    variant: 'outline',
    children: <ArrowRight />,
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled Button',
    disabled: true,
  },
};

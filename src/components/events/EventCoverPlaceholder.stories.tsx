import type { Meta, StoryObj } from '@storybook/react';
import { EventCoverPlaceholder } from './EventCoverPlaceholder';

const meta: Meta<typeof EventCoverPlaceholder> = {
  title: 'Events/EventCoverPlaceholder',
  component: EventCoverPlaceholder,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[380px] aspect-16/10 rounded-2xl overflow-hidden border border-zinc-200 shadow-md">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof EventCoverPlaceholder>;

export const WebendCoffeeTalk: Story = {
  args: {
    seed: '33123:pubkey:webend-coffee-talk-7',
    title: 'Webend Coffee Talk - 7',
    size: 'default',
    showMonogram: true,
  },
};

export const NostrHackathon: Story = {
  args: {
    seed: '33123:pubkey:nostr-hackathon-2026',
    title: 'Nostr Hackathon 2026',
    size: 'default',
    showMonogram: true,
  },
};

export const CosplayMeetup: Story = {
  args: {
    seed: '33123:pubkey:cosplay-community-meetup',
    title: 'Cosplay Community Meetup',
    size: 'default',
    showMonogram: true,
  },
};

export const CompactSize: Story = {
  decorators: [
    (Story) => (
      <div className="w-[260px] aspect-16/9 rounded-xl overflow-hidden border border-zinc-200 shadow-sm">
        <Story />
      </div>
    ),
  ],
  args: {
    seed: '33123:pubkey:curated-spotlight-1',
    title: 'Street Photography Tour',
    size: 'sm',
    showMonogram: true,
  },
};

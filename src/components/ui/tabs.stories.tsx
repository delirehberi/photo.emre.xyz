import type { Meta, StoryObj } from '@storybook/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
import { ShieldCheck, Users } from 'lucide-react';

const meta: Meta = {
  title: 'Primitives/Tabs',
  component: Tabs,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="official" className="w-[450px]">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="official" className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          Official Gallery (42)
        </TabsTrigger>
        <TabsTrigger value="community" className="flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-400" />
          Community (18)
        </TabsTrigger>
      </TabsList>
      <TabsContent
        value="official"
        className="p-4 rounded-md border border-zinc-800 bg-zinc-950 text-zinc-300 text-sm"
      >
        Displaying photos published directly by the album organizer (pubkey
        matched).
      </TabsContent>
      <TabsContent
        value="community"
        className="p-4 rounded-md border border-zinc-800 bg-zinc-950 text-zinc-300 text-sm"
      >
        Displaying crowd-sourced photo submissions tagging this event via NIP-52
        a-tag references.
      </TabsContent>
    </Tabs>
  ),
};

import type { Meta, StoryObj } from '@storybook/react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from './dropdown-menu';
import { Button } from './button';
import { MoreVertical, Download, Share2, Trash2 } from 'lucide-react';

const meta: Meta = {
  title: 'Primitives/DropdownMenu',
  component: DropdownMenu,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Photo Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Download className="mr-2 h-4 w-4" />
          Download Watermarked
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Share2 className="mr-2 h-4 w-4" />
          Share NIP-19 Nevent
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-400 focus:text-red-300">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete from Relay
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

import type { Meta, StoryObj } from '@storybook/react';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from './tooltip';
import { Button } from './button';
import { Zap } from 'lucide-react';

const meta: Meta = {
  title: 'Primitives/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm">
            <Zap className="w-4 h-4 text-amber-400 mr-1" />
            21 sats
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Prepaid Lightning upload fee (Admin bypass: 0 sats)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};

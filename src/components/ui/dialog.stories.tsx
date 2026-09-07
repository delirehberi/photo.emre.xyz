import type { Meta, StoryObj } from '@storybook/react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from './dialog';
import { Button } from './button';
import { KeyRound, Copy } from 'lucide-react';

const meta: Meta = {
  title: 'Primitives/Dialog',
  component: Dialog,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Open Modal</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription>
            This is an accessible modal dialog built with Radix UI and Tailwind
            CSS.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 text-sm text-zinc-300">
          Modal content goes here. Focus is trapped and ESC key dismisses the
          dialog.
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button variant="default">Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const KeypairRevealModal: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="default">
          <KeyRound className="w-4 h-4 mr-1" />
          Generate Admin Keypair
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-400" />
            Nostr Secret Key Generated
          </DialogTitle>
          <DialogDescription>
            This is your secret key (nsec). It will never be displayed again.
            Back it up immediately!
          </DialogDescription>
        </DialogHeader>
        <div className="p-3 my-2 font-mono text-xs break-all rounded border border-zinc-800 bg-zinc-900 text-amber-300">
          nsec1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq9238fj
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm">
            <Copy className="w-4 h-4 mr-1" />
            Copy nsec
          </Button>
          <DialogClose asChild>
            <Button variant="default" size="sm">
              I Have Saved My Key
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

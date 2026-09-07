import type { Meta, StoryObj } from '@storybook/react';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from './sheet';
import { Button } from './button';
import { UploadCloud } from 'lucide-react';

const meta: Meta<typeof Sheet> = {
  title: 'UI/Sheet',
  component: Sheet,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Sheet>;

export const BottomDrawer: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="default">
          <UploadCloud className="w-4 h-4 mr-2" />
          Open Bottom Drawer (Mobile)
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Upload Media to Album</SheetTitle>
          <SheetDescription>
            Mobile-friendly bottom drawer with touch handle and queue
            management.
          </SheetDescription>
        </SheetHeader>
        <div className="py-6 text-sm text-zinc-300">
          <div className="rounded-lg border border-dashed border-zinc-800 p-8 text-center bg-zinc-900/30">
            <UploadCloud className="w-8 h-8 mx-auto text-amber-400 mb-2" />
            <p className="font-medium text-zinc-200">Tap to select photos</p>
            <p className="text-xs text-zinc-500 mt-1">
              Direct upload to media.emre.xyz
            </p>
          </div>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
          </SheetClose>
          <Button variant="default">Upload Queue</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};

export const RightSlideOver: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Open Right Slide-Over</Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Technical Details</SheetTitle>
          <SheetDescription>
            Desktop slide-over panel for EXIF and Nostr event inspection.
          </SheetDescription>
        </SheetHeader>
        <div className="py-6 space-y-4 text-xs text-zinc-400">
          <div className="p-3 rounded-md bg-zinc-900 border border-zinc-800">
            <span className="font-semibold text-zinc-200 block mb-1">
              Kind 1063 File Metadata
            </span>
            <p>NIP-94 File Metadata linked via NIP-52 album coordinate.</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  ),
};

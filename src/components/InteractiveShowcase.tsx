import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  ShieldCheck,
  Users,
  Zap,
  KeyRound,
  Copy,
  Check,
  MoreVertical,
  Download,
  Share2,
} from 'lucide-react';

export function InteractiveShowcase() {
  const [copied, setCopied] = useState(false);
  const sampleNpub = 'npub1emre932h0f92h98hf29h38fh293hf82h938hf23';

  const handleCopy = () => {
    navigator.clipboard?.writeText(sampleNpub);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <TooltipProvider>
      <div className="w-full max-w-4xl mx-auto rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-sm shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-zinc-100">
                Design System & Island Hydration
              </h2>
              <Badge variant="official">Phase 1 Active</Badge>
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              Interactive React 19 island testing Radix UI primitives and
              Tailwind styling.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Badge variant="outline" className="cursor-help py-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    21 sats / upload
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                Prepaid Lightning rate (Admin bypass: 0 sats)
              </TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4 text-zinc-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Media Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Download className="mr-2 h-4 w-4" />
                  Download Watermarked
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share2 className="mr-2 h-4 w-4" />
                  Copy Event URI
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-6">
          <Tabs defaultValue="official" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="official" className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                Official Gallery
              </TabsTrigger>
              <TabsTrigger
                value="community"
                className="flex items-center gap-2"
              >
                <Users className="w-4 h-4 text-indigo-400" />
                Community Submissions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="official" className="mt-4 space-y-4">
              <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/60 p-4 text-sm text-zinc-300">
                <p className="font-semibold text-zinc-200">
                  Organizer-Signed Media (Kind 1063 with pubkey match)
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Primary hero masonry grid. Rendered with explicit aspect
                  ratios derived from NIP-94 dim tags to eliminate Cumulative
                  Layout Shift (CLS).
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="default" size="sm">
                        <KeyRound className="w-4 h-4" />
                        Admin Keypair Generator
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <KeyRound className="w-5 h-5 text-amber-400" />
                          Cryptographic Keypair Generator
                        </DialogTitle>
                        <DialogDescription>
                          Generates secure in-browser Nostr keys with zero
                          backend persistence.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 py-3">
                        <div className="rounded-md border border-zinc-800 bg-zinc-900/90 p-3">
                          <span className="text-xs text-zinc-400 block mb-1">
                            Public Key (npub):
                          </span>
                          <span className="font-mono text-xs text-zinc-200 break-all">
                            {sampleNpub}
                          </span>
                        </div>
                        <div className="rounded-md border border-amber-900/50 bg-amber-950/20 p-3">
                          <span className="text-xs text-amber-400 block mb-1">
                            Security Guardrail:
                          </span>
                          <span className="text-xs text-amber-300">
                            Never disclose your nsec. Keys are stored only in
                            volatile memory or encrypted local storage.
                          </span>
                        </div>
                      </div>
                      <DialogFooter className="gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopy}
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                          {copied ? 'Copied!' : 'Copy npub'}
                        </Button>
                        <DialogClose asChild>
                          <Button variant="secondary" size="sm">
                            Done
                          </Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Button variant="outline" size="sm">
                    View Storybook Components
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="community" className="mt-4 space-y-4">
              <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/60 p-4 text-sm text-zinc-300">
                <p className="font-semibold text-zinc-200">
                  Community Submissions (NIP-52 a-tag references)
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Attendee photos referencing the album coordinates. Filtered
                  into a designated collapsible community section with
                  contributor badges.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <Badge variant="community">Attendee Photos</Badge>
                  <Badge variant="outline">NIP-94 Verified</Badge>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </TooltipProvider>
  );
}

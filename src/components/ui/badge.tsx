import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-zinc-900 text-zinc-50 hover:bg-zinc-800',
        secondary:
          'border-zinc-200 bg-zinc-100 text-zinc-800 hover:bg-zinc-200',
        destructive:
          'border-transparent bg-red-600 text-white hover:bg-red-700',
        outline: 'border-zinc-200 bg-white text-zinc-700',
        official:
          'border-amber-500/30 bg-amber-50 text-amber-900 hover:bg-amber-100/80',
        community:
          'border-indigo-500/30 bg-indigo-50 text-indigo-800 hover:bg-indigo-100/80',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

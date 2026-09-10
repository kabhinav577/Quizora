import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        secondary: 'border-transparent bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700',
        destructive: 'border-transparent bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800',
        outline: 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-transparent',
        success: 'border-transparent bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        warning: 'border-transparent bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        purple: 'border-transparent bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

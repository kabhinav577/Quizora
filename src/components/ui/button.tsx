import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-indigo-600 text-white shadow hover:bg-indigo-700 active:bg-indigo-800 dark:bg-indigo-600 dark:hover:bg-indigo-500',
        destructive: 'bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800 dark:bg-red-600 dark:hover:bg-red-500',
        outline:
          'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 text-slate-700 dark:text-slate-200',
        secondary:
          'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm hover:bg-slate-200 dark:hover:bg-slate-700',
        ghost:
          'hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 text-slate-600 dark:text-slate-300',
        link: 'text-indigo-600 dark:text-indigo-400 underline-offset-4 hover:underline',
        success:
          'bg-emerald-600 text-white shadow hover:bg-emerald-700 active:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-lg px-8 text-base font-semibold',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';


export { Button, buttonVariants };

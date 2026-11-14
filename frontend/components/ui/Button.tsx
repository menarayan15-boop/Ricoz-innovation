import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-md transition-all duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer';

    const variants = {
      primary:
        'bg-[#1E2B4A] text-white hover:bg-[#17243E] active:bg-[#121C30] focus-visible:ring-[#1E2B4A] shadow-xs',
      secondary:
        'bg-[#F0F4F8] text-[#1E2B4A] hover:bg-[#D9E2EC] border border-[#D9E2EC] focus-visible:ring-[#526D94]',
      outline:
        'border border-[#E2E8F0] bg-white text-[#202938] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] focus-visible:ring-[#1E2B4A]',
      ghost:
        'text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E2B4A] focus-visible:ring-[#1E2B4A]',
      danger:
        'bg-[#C74C4C] text-white hover:bg-[#B73C3C] active:bg-[#9E2A2A] focus-visible:ring-[#C74C4C] shadow-xs',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      md: 'h-9 px-4 text-sm gap-2',
      lg: 'h-10 px-5 text-base gap-2.5',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

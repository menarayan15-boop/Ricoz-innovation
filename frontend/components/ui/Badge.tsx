import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'navy';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  size = 'md',
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full border transition-colors select-none';

  const variants = {
    success: 'bg-[#EBF5F0] text-[#39805B] border-[#C6E3D3]',
    warning: 'bg-[#FDF8EC] text-[#C58A36] border-[#F4DEB2]',
    error: 'bg-[#FDF2F2] text-[#C74C4C] border-[#F7C5C5]',
    info: 'bg-[#EDF6FA] text-[#2A6F97] border-[#BDE0FE]',
    neutral: 'bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]',
    navy: 'bg-[#F0F4F8] text-[#1E2B4A] border-[#D9E2EC]',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[11px] leading-tight',
    md: 'px-2.5 py-0.5 text-xs',
  };

  return (
    <span
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </span>
  );
};

Badge.displayName = 'Badge';

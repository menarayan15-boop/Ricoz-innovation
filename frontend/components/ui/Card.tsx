import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  className,
  padding = 'md',
  children,
  ...props
}) => {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-[#E2E8F0] shadow-xs transition-shadow duration-150',
        paddings[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

Card.displayName = 'Card';

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn('flex flex-col space-y-1 pb-4 border-b border-[#F1F5F9]', className)}
      {...props}
    >
      {children}
    </div>
  );
};

CardHeader.displayName = 'CardHeader';

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <h3
      className={cn(
        'text-base font-semibold text-[#1E2B4A] tracking-tight',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
};

CardTitle.displayName = 'CardTitle';

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <p
      className={cn('text-xs text-[#64748B] leading-relaxed', className)}
      {...props}
    >
      {children}
    </p>
  );
};

CardDescription.displayName = 'CardDescription';

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className={cn('pt-4', className)} {...props}>
      {children}
    </div>
  );
};

CardContent.displayName = 'CardContent';

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'flex items-center pt-4 border-t border-[#F1F5F9] mt-4',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

CardFooter.displayName = 'CardFooter';

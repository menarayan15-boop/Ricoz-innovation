import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-[#E2E8F0] dark:bg-[#CBD5E1]',
        className
      )}
      {...props}
    />
  );
};

Skeleton.displayName = 'Skeleton';


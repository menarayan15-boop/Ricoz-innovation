import React from 'react';
import { cn } from '@/lib/utils';
import { FolderX } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-white rounded-lg border border-dashed border-[#CBD5E1]',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-[#F0F4F8] border border-[#D9E2EC] flex items-center justify-center text-[#1E2B4A] mb-4 shadow-xs">
        {icon || <FolderX className="w-6 h-6 text-[#526D94]" />}
      </div>
      <h4 className="text-base font-semibold text-[#1E2B4A] mb-1">
        {title}
      </h4>
      <p className="text-xs sm:text-sm text-[#64748B] max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
};

EmptyState.displayName = 'EmptyState';


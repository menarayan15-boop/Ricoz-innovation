import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isRequired?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      isRequired = false,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-[#1E2B4A]"
          >
            {label}
            {isRequired && <span className="text-[#C74C4C] ml-1">*</span>}
          </label>
        )}
        <div className="relative rounded-md shadow-xs">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            className={cn(
              'w-full rounded-md border text-xs sm:text-sm text-[#202938] bg-white transition-all duration-150 placeholder:text-[#94A3B8]',
              'focus:outline-none focus:ring-2 disabled:bg-[#F8FAFC] disabled:text-[#94A3B8] disabled:cursor-not-allowed',
              leftIcon ? 'pl-9' : 'pl-3.5',
              rightIcon || error ? 'pr-9' : 'pr-3.5',
              'py-2',
              error
                ? 'border-[#C74C4C] focus:border-[#C74C4C] focus:ring-[#C74C4C]/15 text-[#202938]'
                : 'border-[#CBD5E1] focus:border-[#1E2B4A] focus:ring-[#1E2B4A]/15',
              className
            )}
            {...props}
          />
          {error ? (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#C74C4C]">
              <AlertCircle className="w-4 h-4" />
            </div>
          ) : rightIcon ? (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#64748B]">
              {rightIcon}
            </div>
          ) : null}
        </div>
        {error ? (
          <p className="text-xs text-[#C74C4C] flex items-center mt-1">
            {error}
          </p>
        ) : helperText ? (
          <p className="text-xs text-[#64748B] mt-1">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

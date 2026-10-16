import * as React from 'react';
import { cn } from './utils.js';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, helperText, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full flex flex-col gap-1">
        {label ? (
          <label
            htmlFor={inputId}
            className="font-label-sm text-label-sm uppercase tracking-wider text-outline select-none"
          >
            {label}
          </label>
        ) : null}
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            type={type}
            aria-invalid={Boolean(error)}
            className={cn(
              'w-full h-12 bg-surface text-on-surface font-body-md text-body-md px-4 rounded-[2px] transition-colors duration-150 placeholder:text-outline focus:outline-none border',
              error
                ? 'border-[#7C1A22] focus:border-[#7C1A22]'
                : 'border-outline-variant focus:border-primary',
              className
            )}
            {...props}
          />
        </div>
        {error ? (
          <span className="font-label-sm text-[12px] text-[#7C1A22]">{error}</span>
        ) : helperText ? (
          <span className="font-body-sm text-[12px] text-outline">{helperText}</span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

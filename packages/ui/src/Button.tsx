import * as React from 'react';
import { cn } from './utils.js';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-label-lg text-label-lg uppercase tracking-wider transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none rounded-[2px]';

    const sizeStyles = {
      sm: 'h-9 px-space-md text-label-md',
      md: 'h-12 px-space-lg text-label-lg',
      lg: 'h-14 px-space-xl text-label-lg',
    };

    const variantStyles = {
      primary: 'bg-primary text-on-primary hover:bg-[#2E2D2B] active:bg-black',
      secondary:
        'bg-transparent border border-primary text-primary hover:bg-primary hover:text-on-primary active:bg-[#2E2D2B]',
      accent: 'bg-[#5A1827] text-white hover:bg-[#4A121A] active:bg-black',
      outline:
        'bg-transparent border border-outline-variant text-on-surface hover:bg-surface-container-high',
      ghost: 'bg-transparent text-on-surface hover:bg-surface-container-high',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
        {...props}
      >
        {isLoading ? (
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent animate-spin mr-space-sm" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

import * as React from 'react';
import { cn } from './utils.js';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'accent' | 'success' | 'alert';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  children,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center font-label-sm text-label-sm uppercase tracking-wider px-space-xs py-1 rounded-[2px] select-none';

  const variantStyles = {
    neutral: 'bg-surface-container-high text-on-surface border border-outline-variant',
    accent: 'bg-secondary text-on-secondary',
    success: 'bg-[#1B3B2B] text-white',
    alert: 'bg-[#7C1A22] text-white',
  };

  return (
    <span className={cn(baseStyles, variantStyles[variant], className)} {...props}>
      {children}
    </span>
  );
};

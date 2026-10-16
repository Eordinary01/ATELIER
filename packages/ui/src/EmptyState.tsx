import * as React from 'react';
import { cn } from './utils.js';
import { Button } from './Button.js';

export interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-space-3xl px-space-lg bg-surface-container-low rounded-[4px] border border-outline-variant',
        className
      )}
    >
      <div className="w-16 h-16 bg-surface-container-high rounded-[2px] flex items-center justify-center text-outline mb-space-md">
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
        </svg>
      </div>
      <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-space-xs">
        {title}
      </h2>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-md mb-space-xl">
        {description}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-space-md">
        {actionText && onAction ? (
          <Button variant="primary" onClick={onAction}>
            {actionText}
          </Button>
        ) : null}
        {secondaryActionText && onSecondaryAction ? (
          <Button variant="secondary" onClick={onSecondaryAction}>
            {secondaryActionText}
          </Button>
        ) : null}
      </div>
    </div>
  );
};

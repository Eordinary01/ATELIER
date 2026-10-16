import * as React from 'react';
import { cn, formatINR } from './utils.js';

export interface PriceDisplayProps extends React.HTMLAttributes<HTMLSpanElement> {
  amountPaise: number;
  compareAtPaise?: number | null;
  size?: 'md' | 'lg';
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  amountPaise,
  compareAtPaise,
  size = 'md',
  className,
  ...props
}) => {
  const isLg = size === 'lg';

  return (
    <div className={cn('inline-flex items-baseline gap-2', className)}>
      <span
        className={cn(
          'tabular-nums font-semibold text-on-surface',
          isLg ? 'font-price-lg text-price-lg' : 'font-price-md text-price-md'
        )}
        {...props}
      >
        {formatINR(amountPaise)}
      </span>
      {compareAtPaise && compareAtPaise > amountPaise ? (
        <span
          className={cn(
            'tabular-nums text-outline line-through',
            isLg ? 'font-body-md text-body-md' : 'font-body-sm text-body-sm'
          )}
        >
          {formatINR(compareAtPaise)}
        </span>
      ) : null}
    </div>
  );
};

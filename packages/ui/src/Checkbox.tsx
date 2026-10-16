import * as React from 'react';
import { cn } from './utils.js';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  count?: number | string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, count, id, ...props }, ref) => {
    const generatedId = React.useId();
    const checkboxId = id || generatedId;

    return (
      <label
        htmlFor={checkboxId}
        className={cn(
          'flex items-center justify-between cursor-pointer group select-none py-1',
          className
        )}
      >
        <span className="flex items-center gap-space-sm">
          <input
            id={checkboxId}
            ref={ref}
            type="checkbox"
            className="w-[18px] h-[18px] rounded-[2px] accent-primary cursor-pointer border-primary"
            {...props}
          />
          {label ? (
            <span className="font-body-sm text-body-sm text-on-surface group-hover:text-primary transition-colors">
              {label}
            </span>
          ) : null}
        </span>
        {count !== undefined ? (
          <span className="font-label-sm text-label-sm text-outline">
            {typeof count === 'number' && count < 10 ? `0${count}` : count}
          </span>
        ) : null}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

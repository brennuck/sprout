"use client";

import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, id, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const errorId = `${selectId}-error`;
    
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-sage-700">
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={cn(
            "block min-h-11 w-full rounded-xl border border-line bg-surface/80 px-4 py-2.5 text-ink",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:border-focus",
            "transition-all duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-sage-50",
            error && "border-red-400 focus:ring-red-400/50 focus:border-red-400",
            className
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p id={errorId} role="alert" className="text-sm text-danger">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select };


"use client";

import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Field, controlClassName } from "@/components/ui/Field";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  error?: string;
  hint?: ReactNode;
  options: SelectOption[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, options, id, placeholder, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const describedBy = error || hint ? `${selectId}-description` : undefined;

    return (
      <Field id={selectId} label={label} hint={hint} error={error}>
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={cn(controlClassName, "appearance-none pr-10", className)}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
        </div>
      </Field>
    );
  },
);

Select.displayName = "Select";

export { Select };

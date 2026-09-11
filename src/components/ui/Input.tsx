"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Field, controlClassName } from "@/components/ui/Field";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label?: ReactNode;
  error?: string;
  hint?: ReactNode;
  prefix?: ReactNode;
  trailing?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, prefix, trailing, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const describedBy = error || hint ? `${inputId}-description` : undefined;

    return (
      <Field id={inputId} label={label} hint={hint} error={error} trailing={trailing}>
        <div className="relative">
          {prefix && (
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ink-muted">
              {prefix}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(controlClassName, prefix && "pl-9", className)}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            {...props}
          />
        </div>
      </Field>
    );
  },
);

Input.displayName = "Input";

export { Input };

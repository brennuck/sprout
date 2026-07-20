"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const descriptionId = `${inputId}-description`;
    
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-sage-700">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "block min-h-11 w-full rounded-xl border border-line bg-surface/80 px-4 py-2.5 text-ink placeholder:text-ink-muted",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:border-focus",
            "transition-all duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-sage-50",
            error && "border-red-400 focus:ring-red-400/50 focus:border-red-400",
            className
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? descriptionId : undefined}
          {...props}
        />
        {error && <p id={descriptionId} role="alert" className="text-sm text-danger">{error}</p>}
        {hint && !error && <p id={descriptionId} className="text-sm text-ink-muted">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };


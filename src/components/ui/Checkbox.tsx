"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
  description?: ReactNode;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, id, ...props }, ref) => {
    const generatedId = useId();
    const checkboxId = id || generatedId;

    return (
      <label
        htmlFor={checkboxId}
        className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl text-sm text-ink has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
      >
        <input
          type="checkbox"
          id={checkboxId}
          ref={ref}
          className={cn(
            "mt-0.5 h-5 w-5 flex-none cursor-pointer rounded border-line-strong bg-surface text-brand accent-[hsl(var(--brand))]",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            className,
          )}
          {...props}
        />
        {(label || description) && (
          <span className="flex flex-col">
            {label && <span className="font-medium">{label}</span>}
            {description && <span className="text-ink-muted">{description}</span>}
          </span>
        )}
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";

export { Checkbox };

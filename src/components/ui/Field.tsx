"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FieldProps {
  id: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  className?: string;
  children: ReactNode;
  /** Visually hide the label while keeping it accessible. */
  hideLabel?: boolean;
  trailing?: ReactNode;
}

/** Shared label / hint / error chrome for form controls. */
export function Field({ id, label, hint, error, className, children, hideLabel, trailing }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor={id}
            className={cn("block text-sm font-medium text-ink-secondary", hideLabel && "sr-only")}
          >
            {label}
          </label>
          {trailing}
        </div>
      )}
      {children}
      {error ? (
        <p id={`${id}-description`} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-description`} className="text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const controlClassName = cn(
  "block min-h-11 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-base text-ink placeholder:text-ink-muted sm:text-sm",
  "transition-[border-color,box-shadow] duration-instant",
  "focus:outline-none focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/40",
  "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-60",
  "aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:ring-danger/40",
);

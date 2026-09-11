"use client";

import { forwardRef, useId, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Field, controlClassName } from "@/components/ui/Field";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  error?: string;
  hint?: ReactNode;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, rows = 3, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    return (
      <Field id={inputId} label={label} hint={hint} error={error}>
        <textarea
          id={inputId}
          ref={ref}
          rows={rows}
          className={cn(controlClassName, "min-h-[5.5rem] resize-y", className)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${inputId}-description` : undefined}
          {...props}
        />
      </Field>
    );
  },
);

Textarea.displayName = "Textarea";

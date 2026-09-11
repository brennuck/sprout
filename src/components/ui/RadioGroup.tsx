"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface RadioOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

interface RadioGroupProps {
  options: RadioOption[];
  label?: ReactNode;
  name?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  orientation?: "horizontal" | "vertical";
}

export function RadioGroup({
  options,
  label,
  name,
  value,
  onValueChange,
  className,
  orientation = "vertical",
}: RadioGroupProps) {
  const generatedName = useId();
  const groupName = name || generatedName;

  return (
    <fieldset className={cn("space-y-2", className)}>
      {label && <legend className="mb-2 block text-sm font-medium text-ink-secondary">{label}</legend>}
      <div className={cn("flex gap-2", orientation === "vertical" ? "flex-col" : "flex-wrap")}>
        {options.map((option) => {
          const checked = value === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                "flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors duration-instant",
                checked ? "border-brand bg-brand-soft/60 text-ink" : "border-line bg-surface text-ink hover:bg-surface-muted",
                option.disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <input
                type="radio"
                name={groupName}
                value={option.value}
                checked={checked}
                disabled={option.disabled}
                onChange={(event) => onValueChange?.(event.target.value)}
                className="mt-0.5 h-4 w-4 flex-none accent-[hsl(var(--brand))] focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
              />
              <span className="flex flex-col">
                <span className="font-medium">{option.label}</span>
                {option.description && <span className="text-ink-muted">{option.description}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

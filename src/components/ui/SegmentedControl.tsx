"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: "sm" | "md";
  className?: string;
  /** Stretch segments to fill the container. */
  fullWidth?: boolean;
}

/**
 * Radio-style segmented control. Arrow keys move selection, matching the
 * WAI-ARIA radiogroup pattern so it works with screen readers and keyboards.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
  className,
  fullWidth = true,
}: SegmentedControlProps<T>) {
  const groupId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (event: KeyboardEvent, index: number) => {
    const enabled = options.map((option, i) => (option.disabled ? -1 : i)).filter((i) => i >= 0);
    const position = enabled.indexOf(index);
    let next = position;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (position + 1) % enabled.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (position - 1 + enabled.length) % enabled.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = enabled.length - 1;
    else return;
    event.preventDefault();
    const target = enabled[next];
    refs.current[target]?.focus();
    onChange(options[target].value);
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex rounded-xl bg-surface-muted p-1",
        fullWidth && "flex w-full",
        className,
      )}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(element) => {
              refs.current[index] = element;
            }}
            id={`${groupId}-${option.value}`}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => move(event, index)}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg font-semibold transition-[background-color,color,box-shadow] duration-instant",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1 focus-visible:ring-offset-surface-muted",
              "disabled:cursor-not-allowed disabled:opacity-50",
              size === "sm" ? "min-h-8 px-2.5 text-xs" : "min-h-10 px-3 text-sm",
              selected ? "bg-surface text-ink shadow-card" : "text-ink-secondary hover:text-ink",
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

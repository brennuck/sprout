"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children: ReactNode;
  selected?: boolean;
  icon?: ReactNode;
  /** Show a clear affordance; `onClear` is called instead of `onClick`. */
  onClear?: () => void;
  tone?: "neutral" | "brand" | "danger" | "warning" | "positive";
  size?: "sm" | "md";
}

const tones = {
  neutral: "border-line bg-surface text-ink hover:bg-surface-muted",
  brand: "border-brand/30 bg-brand-soft text-brand-strong hover:bg-brand-soft/70",
  danger: "border-danger/30 bg-danger-soft text-danger",
  warning: "border-warning/30 bg-warning-soft text-warning",
  positive: "border-positive/30 bg-positive-soft text-positive",
};

/** Toggleable pill button (filters, envelope pickers). Uses aria-pressed for state. */
export const Chip = forwardRef<HTMLButtonElement, ChipProps>(
  ({ children, selected, icon, onClear, tone = "neutral", size = "md", className, type = "button", onClick, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-pressed={selected}
      onClick={onClear && selected ? onClear : onClick}
      className={cn(
        "inline-flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full border font-medium transition-colors duration-instant",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "min-h-8 px-3 text-xs" : "min-h-10 px-3.5 text-sm",
        selected ? "border-brand bg-brand text-brand-contrast hover:bg-brand-strong" : tones[tone],
        className,
      )}
      {...props}
    >
      {icon}
      <span className="truncate">{children}</span>
      {onClear && selected && <X className="h-3.5 w-3.5" aria-hidden="true" />}
    </button>
  ),
);

Chip.displayName = "Chip";

export function ChipRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0", className)}>
      {children}
    </div>
  );
}

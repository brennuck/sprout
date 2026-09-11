"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: icon-only buttons must have an accessible name. */
  label: string;
  variant?: "ghost" | "soft" | "outline" | "danger" | "primary";
  size?: "sm" | "md" | "lg";
  active?: boolean;
}

const variants = {
  ghost: "text-ink-secondary hover:bg-surface-muted hover:text-ink",
  soft: "bg-surface-muted text-ink hover:bg-line",
  outline: "border border-line-strong bg-surface text-ink hover:bg-surface-muted",
  danger: "text-ink-muted hover:bg-danger-soft hover:text-danger",
  primary: "bg-brand text-brand-contrast shadow-card hover:bg-brand-strong",
};

const sizes = {
  sm: "h-9 w-9 rounded-lg [&>svg]:h-4 [&>svg]:w-4",
  md: "h-11 w-11 rounded-xl [&>svg]:h-5 [&>svg]:w-5",
  lg: "h-14 w-14 rounded-2xl [&>svg]:h-6 [&>svg]:w-6",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, variant = "ghost", size = "md", active, className, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        "inline-flex flex-none items-center justify-center transition-colors duration-instant",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        active && "bg-brand-soft text-brand-strong",
        className,
      )}
      {...props}
    />
  ),
);

IconButton.displayName = "IconButton";

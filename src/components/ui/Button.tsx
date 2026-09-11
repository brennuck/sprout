"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive" | "soft";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingLabel?: string;
}

export const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-brand-contrast shadow-card hover:bg-brand-strong active:bg-brand-strong",
  secondary:
    "bg-brand-soft text-brand-strong hover:bg-brand-soft/70 active:bg-brand-soft/60",
  outline:
    "border border-line-strong bg-surface text-ink hover:bg-surface-muted active:bg-surface-muted",
  ghost: "text-ink-secondary hover:bg-surface-muted hover:text-ink active:bg-surface-muted",
  soft: "bg-surface-muted text-ink hover:bg-line active:bg-line",
  destructive:
    "bg-danger text-ink-inverse shadow-card hover:brightness-95 active:brightness-90",
};

export const buttonSizes: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-sm gap-1.5 rounded-lg",
  md: "min-h-11 px-4 text-sm gap-2 rounded-xl",
  lg: "min-h-12 px-6 text-base gap-2 rounded-xl",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", isLoading, loadingLabel, children, disabled, type = "button", ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex select-none items-center justify-center whitespace-nowrap font-semibold transition-[background-color,box-shadow,transform] duration-instant",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
          buttonVariants[variant],
          buttonSizes[size],
          className,
        )}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {isLoading && loadingLabel ? loadingLabel : children}
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button };

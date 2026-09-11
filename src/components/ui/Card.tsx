import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "muted" | "outline" | "brand" | "warning" | "danger" | "positive";
  padding?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
}

const variants = {
  default: "bg-surface shadow-card border border-line/60",
  muted: "bg-surface-muted",
  outline: "bg-transparent border border-line",
  brand: "bg-brand-soft/60 border border-brand/20",
  warning: "bg-warning-soft border border-warning/25",
  danger: "bg-danger-soft border border-danger/25",
  positive: "bg-positive-soft border border-positive/25",
};

const paddings = {
  none: "p-0",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export function Card({
  className,
  variant = "default",
  padding = "md",
  interactive,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl",
        variants[variant],
        paddings[padding],
        interactive &&
          "transition-[transform,box-shadow] duration-instant hover:shadow-float focus-within:ring-2 focus-within:ring-focus",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-3", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn("text-lg font-bold text-ink", className)} {...props}>
      {children}
    </h2>
  );
}

export function CardDescription({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("mt-0.5 text-sm text-ink-muted", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mt-5 border-t border-line pt-4", className)} {...props}>
      {children}
    </div>
  );
}

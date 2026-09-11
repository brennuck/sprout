import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

interface StatProps {
  label: ReactNode;
  value: number | ReactNode;
  hint?: ReactNode;
  tone?: "default" | "brand" | "positive" | "warning" | "danger";
  icon?: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const tones = {
  default: "text-ink",
  brand: "text-brand-strong",
  positive: "text-positive",
  warning: "text-warning",
  danger: "text-danger",
};

export function Stat({ label, value, hint, tone = "default", icon, className, size = "md" }: StatProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted sm:text-sm sm:normal-case sm:tracking-normal">
        {icon}
        <span className="truncate">{label}</span>
      </p>
      <p
        className={cn(
          "tabular mt-1 truncate font-bold",
          size === "sm" ? "text-lg" : size === "lg" ? "text-3xl sm:text-4xl" : "text-xl sm:text-2xl",
          tones[tone],
        )}
      >
        {typeof value === "number" ? formatCurrency(value) : value}
      </p>
      {hint && <div className="mt-1 text-xs text-ink-muted">{hint}</div>}
    </div>
  );
}

interface AmountProps {
  value: number;
  /** Prefix + or − and color by sign. */
  signed?: boolean;
  type?: "INCOME" | "EXPENSE" | "TRANSFER" | "ADJUSTMENT";
  className?: string;
}

export function Amount({ value, signed, type, className }: AmountProps) {
  const negative = type === "EXPENSE" || (type === "ADJUSTMENT" && value < 0) || (signed && value < 0);
  const positive = type === "INCOME" || (type === "ADJUSTMENT" && value > 0) || (signed && value > 0 && !type);
  const prefix = type === "EXPENSE" ? "−" : type === "INCOME" ? "+" : type === "ADJUSTMENT" ? (value >= 0 ? "+" : "−") : signed ? (value < 0 ? "−" : "+") : "";
  return (
    <span
      className={cn(
        "tabular whitespace-nowrap font-semibold",
        positive ? "text-positive" : negative ? "text-ink" : "text-brand-strong",
        className,
      )}
    >
      {prefix}
      {formatCurrency(Math.abs(value))}
    </span>
  );
}

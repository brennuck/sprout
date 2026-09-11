import { cn } from "@/lib/utils";

interface ProgressBarProps {
  /** 0..100 */
  value: number;
  label: string;
  tone?: "brand" | "positive" | "warning" | "danger" | "info";
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Optional secondary marker (e.g. how far through the month we are). */
  marker?: number | null;
}

const tones = {
  brand: "bg-brand",
  positive: "bg-positive",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
};

const sizes = { sm: "h-1.5", md: "h-2", lg: "h-3" };

export function ProgressBar({ value, label, tone = "brand", size = "md", className, marker }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className={cn("relative w-full overflow-hidden rounded-full bg-surface-muted", sizes[size], className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-quick ease-out", tones[tone])}
        style={{ width: `${clamped}%` }}
      />
      {marker != null && marker > 0 && marker < 100 && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 w-0.5 bg-ink/40"
          style={{ left: `${marker}%` }}
        />
      )}
    </div>
  );
}

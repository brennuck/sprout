import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

function useReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function chartPalette(count: number) {
  const colors = [
    "hsl(var(--brand))",
    "hsl(var(--positive))",
    "hsl(var(--warning))",
    "hsl(var(--info))",
    "hsl(var(--danger))",
    "hsl(99 22% 52%)",
    "hsl(25 70% 48%)",
    "hsl(200 40% 42%)",
  ];
  return Array.from({ length: count }, (_, index) => colors[index % colors.length]);
}

interface BarChartProps {
  series: { label: string; income: number; spending: number }[];
  className?: string;
}

export function BarChart({ series, className }: BarChartProps) {
  const max = Math.max(1, ...series.flatMap((row) => [row.income, row.spending]));
  const reduced = useReducedMotion();
  return (
    <div className={cn("space-y-4", className)} role="img" aria-label="Income and spending by month">
      <title>Income versus spending</title>
      {series.map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex justify-between text-xs font-semibold text-ink-secondary">
            <span>{row.label}</span>
            <span>Net {formatCurrency(row.income - row.spending)}</span>
          </div>
          <div className="space-y-1">
            <BarRow label="Income" tone="bg-positive" value={row.income} max={max} instant={reduced} />
            <BarRow label="Spent" tone="bg-danger" value={row.spending} max={max} instant={reduced} />
          </div>
        </div>
      ))}
    </div>
  );
}

function BarRow({ label, tone, value, max, instant }: { label: string; tone: string; value: number; max: number; instant: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 text-xs text-ink-muted">{label}</span>
      <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-muted">
        <div
          className={cn("h-full rounded-full", tone, !instant && "transition-[width] duration-quick")}
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
      <span className="tabular w-20 text-right text-xs text-ink">{formatCurrency(value)}</span>
    </div>
  );
}

interface LineChartProps {
  points: { label: string; value: number }[];
  className?: string;
  color?: string;
  label: string;
}

export function LineChart({ points, className, color = "hsl(var(--brand))", label }: LineChartProps) {
  const width = 640;
  const height = 220;
  const pad = { top: 16, right: 12, bottom: 28, left: 12 };
  const values = points.map((point) => point.value);
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const x = (index: number) => pad.left + (points.length < 2 ? innerW / 2 : (index / (points.length - 1)) * innerW);
  const y = (value: number) => pad.top + innerH - ((value - min) / (max - min || 1)) * innerH;
  const d = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${x(index).toFixed(1)} ${y(point.value).toFixed(1)}`)
    .join(" ");
  const area = `${d} L ${x(points.length - 1).toFixed(1)} ${y(min).toFixed(1)} L ${x(0).toFixed(1)} ${y(min).toFixed(1)} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn("h-auto w-full", className)} role="img" aria-label={label}>
      <title>{label}</title>
      <desc>
        {points.map((point) => `${point.label}: ${formatCurrency(point.value)}`).join(". ")}
      </desc>
      <path d={area} fill={color} opacity={0.12} />
      <path d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((point, index) => (
        <circle key={point.label} cx={x(index)} cy={y(point.value)} r={3.5} fill={color}>
          <title>
            {point.label}: {formatCurrency(point.value)}
          </title>
        </circle>
      ))}
      {points.map((point, index) =>
        index === 0 || index === points.length - 1 || points.length < 8 ? (
          <text
            key={`${point.label}-label`}
            x={x(index)}
            y={height - 8}
            textAnchor="middle"
            className="fill-ink-muted"
            fontSize={11}
          >
            {point.label}
          </text>
        ) : null,
      )}
    </svg>
  );
}

export function Sparkline({ values, className, color = "hsl(var(--brand))" }: { values: number[]; className?: string; color?: string }) {
  const width = 120;
  const height = 32;
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const d = values
    .map((value, index) => {
      const x = values.length < 2 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - ((value - min) / (max - min || 1)) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn("h-8 w-24", className)} aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

interface DonutChartProps {
  slices: { label: string; value: number }[];
  className?: string;
  totalLabel?: string;
}

export function DonutChart({ slices, className, totalLabel }: DonutChartProps) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  const colors = chartPalette(slices.length);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className={cn("flex flex-col items-center gap-5 sm:flex-row sm:items-start", className)}>
      <svg viewBox="0 0 120 120" className="h-40 w-40 flex-none" role="img" aria-label="Spending breakdown">
        <title>Spending by envelope</title>
        <circle cx="60" cy="60" r={radius} fill="none" stroke="hsl(var(--surface-muted))" strokeWidth={16} />
        {slices.map((slice, index) => {
          const length = (slice.value / total) * circumference;
          const circle = (
            <circle
              key={slice.label}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={colors[index]}
              strokeWidth={16}
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 60 60)"
            >
              <title>
                {slice.label}: {formatCurrency(slice.value)}
              </title>
            </circle>
          );
          offset += length;
          return circle;
        })}
        <text x="60" y="56" textAnchor="middle" className="fill-ink" fontSize="13" fontWeight={700}>
          {formatCurrency(slices.reduce((sum, slice) => sum + slice.value, 0))}
        </text>
        <text x="60" y="72" textAnchor="middle" className="fill-ink-muted" fontSize="10">
          {totalLabel ?? "spent"}
        </text>
      </svg>
      <ul className="min-w-0 flex-1 space-y-2 text-sm">
        {slices.map((slice, index) => (
          <li key={slice.label} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: colors[index] }} aria-hidden="true" />
              <span className="truncate text-ink">{slice.label}</span>
            </span>
            <span className="tabular text-ink-secondary">{formatCurrency(slice.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

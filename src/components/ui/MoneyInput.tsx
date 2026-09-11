"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Field } from "@/components/ui/Field";

export interface MoneyInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "size"> {
  value: string;
  onValueChange: (value: string) => void;
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  /** `hero` renders the large keypad-friendly amount used by the Add sheet. */
  size?: "md" | "hero";
  allowNegative?: boolean;
  trailing?: ReactNode;
}

/** Keep only digits and a single decimal point with up to two decimals. */
export function sanitizeMoney(raw: string, allowNegative = false) {
  let value = raw.replace(/[^\d.-]/g, "");
  const negative = allowNegative && value.startsWith("-");
  value = value.replace(/-/g, "");
  const [whole = "", ...rest] = value.split(".");
  const decimals = rest.join("").slice(0, 2);
  const cleanWhole = whole.replace(/^0+(?=\d)/, "").slice(0, 10);
  const result = rest.length ? `${cleanWhole || "0"}.${decimals}` : cleanWhole;
  return negative ? `-${result}` : result;
}

export function parseMoney(value: string) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
}

const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  (
    { value, onValueChange, label, hint, error, size = "md", allowNegative, className, id, trailing, ...props },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const describedBy = error || hint ? `${inputId}-description` : undefined;
    const hero = size === "hero";

    return (
      <Field id={inputId} label={label} hint={hint} error={error} hideLabel={hero && !label} trailing={trailing}>
        <div className="relative">
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-y-0 flex items-center text-ink-muted",
              hero ? "left-0 text-3xl font-semibold sm:text-4xl" : "left-3.5 text-base",
            )}
          >
            $
          </span>
          <input
            id={inputId}
            ref={ref}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            enterKeyHint="done"
            value={value}
            onChange={(event) => onValueChange(sanitizeMoney(event.target.value, allowNegative))}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            placeholder="0.00"
            className={cn(
              "tabular w-full bg-transparent text-ink placeholder:text-ink-muted/60 focus:outline-none",
              hero
                ? "border-b-2 border-line py-2 pl-7 text-4xl font-bold focus-visible:border-focus sm:pl-8 sm:text-5xl"
                : "min-h-11 rounded-xl border border-line bg-surface py-2.5 pl-8 pr-3.5 text-base transition-[border-color,box-shadow] duration-instant focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/40 sm:text-sm",
              error && "border-danger",
              className,
            )}
            {...props}
          />
        </div>
      </Field>
    );
  },
);

MoneyInput.displayName = "MoneyInput";

export { MoneyInput };

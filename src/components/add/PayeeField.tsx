"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { controlClassName } from "@/components/ui/Field";
import type { SnapshotPayee } from "@/lib/data/types";

interface PayeeFieldProps {
  value: string;
  onChange: (value: string) => void;
  onPick: (payee: SnapshotPayee) => void;
  payees: SnapshotPayee[];
  label: string;
  placeholder?: string;
  error?: string;
  autoFocus?: boolean;
}

/**
 * Combobox for the payee/description. Suggests remembered payees as you type
 * and lets the parent auto-fill envelope + account when one is picked.
 */
export function PayeeField({ value, onChange, onPick, payees, label, placeholder, error, autoFocus }: PayeeFieldProps) {
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    const query = value.trim().toLowerCase();
    const pool = query
      ? payees.filter((payee) => payee.name.toLowerCase().includes(query))
      : payees;
    return pool
      .slice()
      .sort((a, b) => {
        if (query) {
          const aStarts = a.name.toLowerCase().startsWith(query) ? 0 : 1;
          const bStarts = b.name.toLowerCase().startsWith(query) ? 0 : 1;
          if (aStarts !== bStarts) return aStarts - bStarts;
        }
        return b.useCount - a.useCount;
      })
      .slice(0, 6);
  }, [payees, value]);

  useEffect(() => {
    setHighlight(0);
  }, [value]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const pick = (payee: SnapshotPayee) => {
    onChange(payee.name);
    onPick(payee);
    setOpen(false);
  };

  const showList = open && suggestions.length > 0 && !(suggestions.length === 1 && suggestions[0].name === value);

  return (
    <div ref={wrapperRef} className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink-secondary">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList ? `${listId}-${highlight}` : undefined}
          aria-invalid={error ? true : undefined}
          autoComplete="off"
          autoCapitalize="words"
          enterKeyHint="next"
          value={value}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (!showList) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setHighlight((current) => (current + 1) % suggestions.length);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlight((current) => (current - 1 + suggestions.length) % suggestions.length);
            } else if (event.key === "Enter") {
              event.preventDefault();
              pick(suggestions[highlight]);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          className={controlClassName}
        />
        {showList && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Suggested payees"
            className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-float"
          >
            {suggestions.map((payee, index) => (
              <li
                key={payee.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === highlight}
                onMouseEnter={() => setHighlight(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(payee)}
                className={cn(
                  "flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm text-ink",
                  index === highlight && "bg-brand-soft text-brand-strong",
                )}
              >
                <Clock3 className="h-3.5 w-3.5 flex-none text-ink-muted" aria-hidden="true" />
                <span className="truncate">{payee.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

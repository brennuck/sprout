"use client";

import { type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface RadioOption {
  value: string;
  label: string;
}

interface RadioGroupProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  options: RadioOption[];
  label?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

export function RadioGroup({ options, label, name, value, onValueChange, className, ...props }: RadioGroupProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <span className="block text-sm font-medium text-sage-700">{label}</span>
      )}
      <div className="flex gap-4">
        {options.map((option) => (
          <label key={option.value} className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onValueChange?.(e.target.value)}
              className={cn(
                "w-4 h-4 border-sage-300 text-sage-600",
                "focus:ring-sage-400 focus:ring-offset-0",
                "transition-colors duration-200"
              )}
              {...props}
            />
            <span className="text-sm text-sage-700">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}


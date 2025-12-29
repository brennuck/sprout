"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const checkboxId = id || label?.toLowerCase().replace(/\s+/g, "-");
    
    return (
      <label htmlFor={checkboxId} className="inline-flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          id={checkboxId}
          ref={ref}
          className={cn(
            "w-4 h-4 rounded border-sage-300 text-sage-600",
            "focus:ring-sage-400 focus:ring-offset-0",
            "transition-colors duration-200",
            className
          )}
          {...props}
        />
        {label && <span className="text-sm text-sage-700">{label}</span>}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";

export { Checkbox };


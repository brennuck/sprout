"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-sage-700">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "block w-full px-4 py-2.5 bg-white/80 border border-sage-200 rounded-xl text-sage-900 placeholder:text-sage-400",
            "focus:outline-none focus:ring-2 focus:ring-sage-400/50 focus:border-sage-400",
            "transition-all duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-sage-50",
            error && "border-red-400 focus:ring-red-400/50 focus:border-red-400",
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        {hint && !error && <p className="text-sm text-sage-500">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };

